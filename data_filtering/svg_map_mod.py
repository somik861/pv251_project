from argparse import ArgumentParser

two_to_three_ISO: dict[str, str] = {
    'AT': 'AUT',
    'BE': 'BEL',
    'BG': 'BGR',
    'HR': 'HRV',
    'CY': 'CYP',
    'CZ': 'CZE',
    'DK': 'DNK',
    'EE': 'EST',
    'FI': 'FIN',
    'FR': 'FRA',
    'DE': 'DEU',
    'GR': 'GRC',
    'HU': 'HUN',
    'IE': 'IRL',
    'IT': 'ITA',
    'LV': 'LVA',
    'LT': 'LTU',
    'LU': 'LUX',
    'MT': 'MLT',
    'NL': 'NLD',
    'PL': 'POL',
    'PT': 'PRT',
    'RO': 'ROU',
    'SK': 'SVK',
    'SI': 'SVN',
    'ES': 'ESP',
    'SE': 'SWE',
    'AL': 'ALB',
    'AD': 'AND',
    'AM': 'ARM',
    'BY': 'BLR',
    'BA': 'BIH',
    'FO': 'FRO',
    'GE': 'GEO',
    'GI': 'GIB',
    'IS': 'ISL',
    'IM': 'IMN',
    'XK': 'XKX',
    'LI': 'LIE',
    'MK': 'MKD',
    'MD': 'MDA',
    'MC': 'MCO',
    'ME': 'MNE',
    'NO': 'NOR',
    'RU': 'RUS',
    'SM': 'SMR',
    'RS': 'SRB',
    'CH': 'CHE',
    'TR': 'TUR',
    'UA': 'UKR',
    'GB': 'GBR',
    'VA': 'VAT',
}


def replace_id(svg: str, old_id: str, new_id: str) -> str:
    old_tag = f'id="{old_id.lower()}"'
    new_tag = f'id="{new_id}"'
    if svg.count(old_tag) != 1:
        print(f'{old_tag}, count {svg.count(old_tag)}')
    return svg.replace(old_tag, new_tag)


def modify_svg(svg: str) -> str:
    for two, three in two_to_three_ISO.items():
        svg = replace_id(svg, two, three)
    return svg


def main(inp: str, out: str) -> None:
    svg = open(inp, 'r').read()

    svg = modify_svg(svg)

    open(out, 'w').write(svg)


if __name__ == '__main__':
    parser = ArgumentParser()

    parser.add_argument('i', type=str, metavar="SVG", help='Input SVG')
    parser.add_argument('o', type=str, metavar="SVG", help='Output SVG')

    args = parser.parse_args()

    main(args.i, args.o)
