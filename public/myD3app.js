var knownCountries = []

const sourceColorMap = {
    'biofuel': 'green',
    'coal': '#7C7C7D',
    'gas': '#D0FDDB',
    'hydro': '#0080FF',
    'nuclear': 'orange',
    'oil': '#B38E37',
    'solar': 'yellow',
    'wind': '#00CCCC',
    'all': 'white',
}

const knownSources = Object.keys(sourceColorMap).filter(value => value != 'all')

// Loaded before run() is called
var rawData
var isoNameMap

var selectedSources = {}
for (const source of knownSources)
    selectedSources[source] = true
selectedSources['all'] = true

var isPerCapitaSelected = false
var selectedYear = 2020

const minYear = 1985
const maxYear = 2021

var stackChartCache = {}

// ========== HELPERS ============
function _get_width(elem) {
    return d3.select(elem).node().clientWidth
}

function _get_height(elem) {
    return d3.select(elem).node().clientHeight
}

function _get_selection_width(elem) {
    return elem.node().clientWidth
}

function _get_selection_height(elem) {
    return elem.node().clientHeight
}


function _get_suffix() {
    if (isPerCapitaSelected)
        return '_perc';

    return '_abs';
}

function _get_country_sum(country, override_selection = false) {
    let sum = null;

    for (const source of knownSources) {
        let add = _get_source_value(country, source, override_selection);
        if (add != null)
            sum += add
    }

    return sum;
}

function _get_max_sum_value() {
    let values = []
    for (const country of knownCountries)
        for (let year = minYear; year <= maxYear; ++year)
            values.push(rawData[country][year]['electricity' + _get_suffix()]);


    return Math.max(...values)
}

function _get_source_value(country, source, override_selection = false) {
    if (!override_selection && !selectedSources[source])
        return 0;

    return rawData[country][selectedYear][source + _get_suffix()];
}

function _get_max_source_value(country) {
    let values = []
    for (const source of knownSources) {
        let val = _get_source_value(country, source, true)
        if (val != null)
            values.push(val)
    }

    if (values.length == 0)
        return null
    return Math.max(...values)
}

function _get_heat_range() {
    return [0, _get_max_sum_value()]
}

function _get_color_scale() {
    return d3.scaleSequential().domain(_get_heat_range()).interpolator(d3.interpolateRgbBasis(['darkpurple', 'blue', 'lightblue', 'yellow', 'orange', 'darkorange', 'darkred']))
}

function _get_linspace(min, max, steps) {
    vals = []
    range = max - min;
    for (let i = 0; i < steps; ++i)
        vals.push(range / (steps - 1) * i + min)

    return vals
}

function _get_source_europe(source, year, override_selection = false) {
    let yearBackup = selectedYear
    selectedYear = year
    let val = null
    for (const country of knownCountries) {
        add = _get_source_value(country, source, override_selection)
        if (add != null)
            val += add
    }
    selectedYear = yearBackup
    return val
}

function _get_max_value_europe() {
    let values = []
    for (let year = minYear; year <= maxYear; ++year) {
        let val = null
        for (const source of knownSources) {
            let add = _get_source_europe(source, year, true)
            if (add != null)
                val += add
        }
        if (val != null)
            values.push(val)
    }

    if (values.length == 0)
        return null
    return Math.max(...values)
}

function _get_mult_unit() {
    let mult = isPerCapitaSelected ? 3 : 9
    let unit = isPerCapitaSelected ? 'MWh' : 'PWh'
    return [mult, unit]
}

function _get_color(value, scale) {
    if (value == null)
        return 'lightgray'
    return scale(value)
}

function _get_value_text(val, include_unit = true) {
    let [mult, unit] = _get_mult_unit()
    if (val == null)
        return 'NaN'

    let text = (val / Math.pow(10, mult)).toFixed(1)
    if (include_unit)
        text += ' ' + unit
    return text
}

// ========== LOAD CSV ==========
d3.json('public/iso_name_map.json').get(function (error, data) {
    isoNameMap = data;

    d3.json('public/energy_cons.json')
        .get(function (error, data) {
            rawData = data;

            // fill known states
            for (const country in rawData)
                knownCountries.push(country)

            // Compute absolute/per_capita consumption of source
            for (const country in rawData)
                for (const year in rawData[country]) {
                    let population = rawData[country][year]['population'];
                    let elec_perc = rawData[country][year]['electricity_perc']

                    if (population == null || elec_perc == null)
                        rawData[country][year]['electricity_abs'] = null;
                    else
                        rawData[country][year]['electricity_abs'] = population * elec_perc;

                    let elec_abs = rawData[country][year]['electricity_abs']
                    for (const source of knownSources) {
                        let source_pct = rawData[country][year][source + '_pct'];
                        if (source_pct == null || elec_abs == null)
                            rawData[country][year][source + '_abs'] = null
                        else
                            rawData[country][year][source + '_abs'] = source_pct * elec_abs / 100

                        if (source_pct == null || elec_perc == null)
                            rawData[country][year][source + '_perc'] = null
                        else
                            rawData[country][year][source + '_perc'] = source_pct * elec_perc / 100
                    };
                }

            // run only after csv is loaded
            run();
        })
})


// ========== VIZUALIZATION ============
function redraw_viz() {
    color_map()
    color_selected_sources()
    color_per_capita_rect()
    color_heat_legend()
    color_stackchart()
}

function color_selected_sources() {
    var color = function (src) {
        if (selectedSources[src])
            return sourceColorMap[src]
        else
            return '#4E4E4E';
    }

    for (const src of knownSources)
        d3.select('#rect_' + src).style('fill', color(src))

    d3.select('#rect_all').style('fill', color('all'))
}

function color_map() {
    var color_scale = _get_color_scale();

    for (const country of knownCountries) {
        let sum = _get_country_sum(country)
        d3.select('#svg_map').select('#' + country).style('fill', _get_color(sum, color_scale))
    }
}

function color_per_capita_rect() {
    d3.select('#per_capita_rect').attr(
        'fill', isPerCapitaSelected ? 'green' : '#4E4E4E'
    );
}

function color_heat_legend() {
    let gradient = d3.select('#div_heat_legend').select('svg').select('linearGradient')

    let color_scale = _get_color_scale()
    let range = _get_heat_range()
    const color_stops = 10;
    let range_splits = _get_linspace(range[0], range[1], color_stops)
    let percentage_splits = _get_linspace(0, 100, color_stops)

    gradient.selectAll('*').remove()
    gradient.attrs({
        x1: '50%',
        x2: '50%',
        y1: '100%',
        y2: '0%',
        id: 'heat_gradient'
    })

    for (let i = 0; i < color_stops; ++i)
        gradient.append('stop')
            .attrs({
                offset: '' + percentage_splits[i] + '%',
                'stop-color': color_scale(range_splits[i])
            })

    let legend = d3.select('#div_heat_legend').select('svg')
    const height = 200;
    const width = 120;
    const bar_width = 20;
    legend.attr('viewBox', '0 0 ' + width + ' ' + height)
    let [mult, unit] = _get_mult_unit()

    legend.select('rect').attrs({
        fill: 'url(#heat_gradient)',
        width: bar_width - 2,
        height: height - 2,
        x: 1,
        y: 1,
        'stroke-width': 1,
        stroke: 'black',
    })

    legend.selectAll('text').remove()
    legend.append('text').attrs({
        x: bar_width + 5,
        y: 15,
        class: 'heat_legend_text'
    }).text(_get_value_text(range[1]))
    legend.append('text').attrs({
        x: bar_width + 5,
        y: height,
        class: 'heat_legend_text'
    }).text(range[0].toFixed(1))
}

function color_stackchart() {
    let stack_chart = d3.select('#div_stackchart').select('svg')
    let max_value = _get_max_value_europe()

    const legend_offset = 60;
    const top_offset = 10;

    const width = 1000
    const height = 100
    stack_chart.attr('viewBox', '0 0 ' + width + ' ' + height)

    const chart_height = height - top_offset
    let year_offsets = _get_linspace(legend_offset, width, maxYear - minYear + 2)
    let bar_width = (width - legend_offset) / (maxYear - minYear + 1) * 0.9

    stack_chart.selectAll('*').remove()

    for (let year = minYear; year <= maxYear; ++year) {
        let bar_offset = 0
        for (const source of knownSources.slice().reverse()) {
            let val = _get_source_europe(source, year)
            let bar_height = val / max_value * chart_height

            let prev_y = stackChartCache[year][source]['y']
            let prev_height = stackChartCache[year][source]['height']

            let now_y = chart_height - bar_height - bar_offset + top_offset
            let now_height = bar_height

            stackChartCache[year][source]['y'] = now_y
            stackChartCache[year][source]['height'] = now_height
            let rect = stack_chart.append('rect')
            rect.attrs({
                'width': bar_width,
                'height': prev_height,
                x: year_offsets[year - minYear],
                y: prev_y,
                fill: sourceColorMap[source],
            }).transition()
                .duration(1000)
                .attrs({
                    height: now_height,
                    y: now_y
                })
            rect.append('title').text(source + ': ' + _get_value_text(val))
            bar_offset += bar_height
        }
    }


    stack_chart.append('text').attrs({
        x: 5,
        y: 15,
        class: 'heat_legend_text'
    }).text(_get_value_text(max_value))

    stack_chart.append('line').attrs({
        y1: top_offset,
        y2: top_offset,
        x1: 100,
        x2: width,
        stroke: 'darkgrey',
        'stroke-width': 1
    })
}

function color_hover_region(region) {
    let svg = d3.select('#div_hover_region').select('svg')
    svg.selectAll('*').remove()

    const width = 100;
    const height = 75;

    let region_name = isoNameMap[region]

    // Region name
    svg.attr('viewBox', '0 0 ' + width + ' ' + height)
    svg.append('text').attrs({
        x: 5,
        y: 15,
        class: 'hover_region_text'
    }).text(region_name)


    // bar chart
    const bar_width = (50 / knownSources.length) * 0.8
    const max_bar_height = 20;
    let max_value = _get_max_source_value(region)
    if (isNaN(max_value) || max_value == 0 || max_value == null)
        max_value = 1
    const bar_offsets = _get_linspace(33, 90, knownSources.length + 1)

    svg.append('line').attrs({
        x1: 30,
        x2: 90,
        y1: 50,
        y2: 50,
        stroke: 'darkgrey',
        'stroke-width': .5
    })


    // Top line
    svg.append('line').attrs({
        x1: 30,
        x2: 90,
        y1: 30,
        y2: 30,
        stroke: 'darkgrey',
        'stroke-width': 0.25
    })
    svg.append('text').attrs({
        x: 7,
        y: 31,
        class: 'hover_legend_text'
    }).text(_get_value_text(max_value))

    // Mid line
    svg.append('line').attrs({
        x1: 30,
        x2: 90,
        y1: 40,
        y2: 40,
        stroke: 'darkgrey',
        'stroke-width': 0.25
    })
    svg.append('text').attrs({
        x: 7,
        y: 41,
        class: 'hover_legend_text'
    }).text(_get_value_text(max_value / 2))



    for (let i = 0; i < knownSources.length; ++i) {
        const source = knownSources[i]
        let value = _get_source_value(region, source, true)
        let value_text = _get_value_text(value, false)
        if (isNaN(value))
            value = 0
        let bar_height = value / max_value * max_bar_height
        svg.append('rect').attrs({
            x: bar_offsets[i],
            y: 49.75 - bar_height,
            width: bar_width,
            height: bar_height,
            fill: sourceColorMap[source]
        })
        svg.append('text').attrs({
            x: bar_offsets[i] + bar_width / 2,
            y: 49.75 - bar_height - 2,
            'text-anchor': 'middle',
            class: 'hover_bar_desc'
        }).text(value_text)
    }

    svg.append('text').attrs({
        x: 7,
        y: 60,
        class: 'hover_legend_desc'
    }).text('Total: ' + (_get_value_text(_get_country_sum(region, true))))

    let popul = ''
    let pop_value = rawData[region][selectedYear]['population']
    if (pop_value < 1000000)
        popul = (pop_value / Math.pow(10, 3)).toFixed(1) + ' thousands'
    else
        popul = (pop_value / Math.pow(10, 6)).toFixed(1) + ' milions'

    if (pop_value == null)
        popul = 'NaN'

    svg.append('text').attrs({
        x: 7,
        y: 70,
        class: 'hover_legend_desc'
    }).text('Population: ' + popul)


}

function draw_time_slider() {
    // Copied code
    var dataTime = d3.range(minYear, maxYear + 1).map(function (d) {
        return new Date(d, 10, 3);
    });

    var sliderTime = d3
        .sliderBottom()
        .min(d3.min(dataTime))
        .max(d3.max(dataTime))
        .step(1000 * 60 * 60 * 24 * 365)
        .width(916)
        .tickFormat(d3.timeFormat('%Y'))
        .tickValues(dataTime)
        .default(new Date(selectedYear, 10, 3))
        .on('onchange', val => {
            let year = d3.timeFormat('%Y')(val)
            selectedYear = year
            d3.select('#div_timeslider').select('svg').select('#text_year').text(year)
            redraw_viz()
        });

    d3.select('#div_timeslider').selectAll('*').remove()

    var gTime = d3
        .select('#div_timeslider')
        .append('svg')
        .attr('viewBox', '0 0 1000 50')
        .append('g')
        .attr('transform', 'translate(70,10)');

    gTime.call(sliderTime);

    gTime.append('text').attrs({
        x: 5 - 70,
        y: 15,
        id: 'text_year',
        'font-size': '1em',
        fill: 'lightgray'
    }).text(selectedYear)

    // End of copied code
}

function run() {

    // HEADER
    let headerArea = d3.select('#div_header')
        .append('svg')
        .attrs({
            viewBox: '0 0 200 400',
        });

    headerArea.append('text').attrs({
        x: 10,
        y: 60,
        class: 'headline',
    }).text('Select resource:')

    var toggle_capita_selected = function () {
        isPerCapitaSelected = !isPerCapitaSelected;
        redraw_viz()
    }

    headerArea.append('rect').attrs({
        id: 'per_capita_rect',
        x: 20,
        y: 10,
        height: 20,
        width: 100,
        fill: 'red',
    }).on('click', toggle_capita_selected)

    headerArea.append('text').attrs({
        x: 25,
        y: 25
    }).text('Per Capita').on('click', toggle_capita_selected)

    var toggle_selected_sources = function (source) {
        selectedSources[source] = !selectedSources[source]
        if (source == 'all')
            for (const src of knownSources)
                selectedSources[src] = selectedSources['all']
        else if (!selectedSources[source])
            selectedSources['all'] = false
        else if (Object.keys(selectedSources).every(x => x == 'all' ? true : selectedSources[x]))
            selectedSources['all'] = true

        redraw_viz()
    }

    let row_y = 75;
    var _add_source = function (source) {
        headerArea.append('rect').attrs({
            id: 'rect_' + source,
            x: 20,
            y: row_y,
            height: 20,
            width: 100,
            fill: sourceColorMap[source]
        }).on('click', function () { toggle_selected_sources(source) })
        headerArea.append('text').attrs({
            x: 25,
            y: row_y + 15,
        }).text(source)
            .on('click', function () { toggle_selected_sources(source) });
        row_y += 25;
    }
    _add_source('all')
    for (const source of knownSources) {
        _add_source(source)
    }

    // DISCLAIMER
    let toggle_disclaimer = function () {
        let disc = d3.select('#div_disclaimer')
        let visibility = disc.style('visibility')

        disc.style('visibility', visibility == 'hidden' ? 'visible' : 'hidden')
    }


    d3.select('#div_disclaimer_icon').select('img').on('click', toggle_disclaimer)


    // STACK CHART
    for (let year = minYear; year <= maxYear; ++year) {
        stackChartCache[year] = {}

        for (const source of knownSources)
            stackChartCache[year][source] = {
                y: 100,
                height: 0
            }
    }

    d3.select('#div_stackchart').append('svg')

    draw_time_slider()


    // HEAT MAP LEGEND
    let heatMapLegend = d3.select('#div_heat_legend').append('svg')

    heatMapLegend.append('rect')
    heatMapLegend.append('linearGradient')
    // EUROPE MAP
    function responseCallback(xhr) {
        d3.select('#div_map_image').append(function () {
            return xhr.responseXML.querySelector('svg');
        }).attrs({
            id: 'svg_map',
        });
    };

    // HOVER REGION
    let map_on_hover = function (id) {
        if (!knownCountries.includes(id))
            return;

        d3.select('#div_hover_region').style('visibility', 'visible')
        color_hover_region(id)
    };

    d3.select('#div_hover_region').append('svg')

    // Final image load
    d3.request("public/europe_mod.svg")
        .mimeType("image/svg+xml")
        .response(responseCallback)
        .get(function (n) {
            let map = d3.select("#svg_map");
            map.selectAll("path")
                .style("fill", "lightgray")
                .style("stroke", "gray")
                .style("stroke-width", 1)
                .on('mouseover', function () {
                    map_on_hover(this.id)
                }).on('mouseout', function () {
                    d3.select('#div_hover_region').style('visibility', 'hidden');
                });


            // Draw actions after map is loaded
            redraw_viz();
        });
}
