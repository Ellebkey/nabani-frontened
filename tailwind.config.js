const path = require('path');
const colors = require('tailwindcss/colors');
const magueyTheme = require('./src/styles/maguey-theme');
const defaultTheme = require('tailwindcss/defaultTheme');
const generatePalette = require(path.resolve(__dirname, ('src/@maguey/tailwind/utils/generate-palette')));

/**
 * Custom palettes
 *
 * Uses the generatePalette helper method to generate
 * Tailwind-like color palettes automatically
 */
const customPalettes = {
    maguey: {
        primary: generatePalette('#5c3a4e'), // Nabani ciruela
        accent: generatePalette('#e9a13b')   // cempasúchil gold
    }
};

/**
 * Themes
 */
const themes = {
    // Default theme is required for theming system to work correctly!
    'default': {
        primary  : {
            ...colors.indigo,
            DEFAULT: colors.indigo[600]
        },
        accent   : {
            ...colors.slate,
            DEFAULT: colors.slate[800]
        },
        warn     : {
            ...colors.red,
            DEFAULT: colors.red[600]
        },
        'on-warn': {
            500: colors.red['50']
        }
    },
    // Rest of the themes will use the 'default' as the base
    // theme and will extend it with their given configuration.
    'maguey': {
        primary: customPalettes.maguey.primary,
        accent : customPalettes.maguey.accent
    }
};

/**
 * Tailwind configuration
 */
const config = {
    darkMode   : 'class',
    content    : ['./src/**/*.{html,scss,ts}'],
    important  : true,
    theme      : {
        // Per-scheme surfaces and inks from the single source
        // (src/styles/maguey-theme.js); the CSS variables are emitted by
        // src/styles/maguey-theming.tailwind.js. See THEME.md.
        mg: {
            customProps: magueyTheme.magueyCustomProps,
        },
        fontSize: {
            'xs'  : '0.625rem',
            'sm'  : '0.75rem',
            'md'  : '0.8125rem',
            'base': '0.875rem',
            'lg'  : '1rem',
            'xl'  : '1.125rem',
            '2xl' : '1.25rem',
            '3xl' : '1.5rem',
            '4xl' : '2rem',
            '5xl' : '2.25rem',
            '6xl' : '2.5rem',
            '7xl' : '3rem',
            '8xl' : '4rem',
            '9xl' : '6rem',
            '10xl': '8rem'
        },
        screens : {
            sm: '600px',
            md: '960px',
            lg: '1280px',
            xl: '1440px'
        },
        extend  : {
            animation               : {
                'spin-slow': 'spin 3s linear infinite'
            },
            colors                  : {
                gray: colors.slate,

                // Maguey 2.0 tokens — RGB triplets live in src/styles/maguey-tokens.scss
                // so body.dark can flip them at runtime (Phase 5)
                canvas: 'rgb(var(--maguey-canvas) / <alpha-value>)',
                // 'surface' y no 'card' para no chocar con la clase .bg-card de Maguey
                surface: 'rgb(var(--maguey-card) / <alpha-value>)',
                ink: {
                    DEFAULT: 'rgb(var(--maguey-ink) / <alpha-value>)',
                    2: 'rgb(var(--maguey-ink-2) / <alpha-value>)',
                    3: 'rgb(var(--maguey-ink-3) / <alpha-value>)'
                },
                line: {
                    DEFAULT: 'rgb(var(--maguey-line) / <alpha-value>)',
                    strong: 'rgb(var(--maguey-line-strong) / <alpha-value>)'
                },
                brand: {
                    DEFAULT: 'rgb(var(--maguey-brand) / <alpha-value>)',
                    strong: 'rgb(var(--maguey-brand-strong) / <alpha-value>)',
                    tint: 'rgb(var(--maguey-brand-tint) / <alpha-value>)',
                    'tint-2': 'rgb(var(--maguey-brand-tint-2) / <alpha-value>)'
                },
                gold: 'rgb(var(--maguey-gold) / <alpha-value>)',
                teal: {
                    ...colors.teal,
                    DEFAULT: 'rgb(var(--maguey-teal) / <alpha-value>)',
                    tint: 'rgb(var(--maguey-teal-tint) / <alpha-value>)'
                },
                rose: {
                    ...colors.rose,
                    DEFAULT: 'rgb(var(--maguey-rose) / <alpha-value>)',
                    tint: 'rgb(var(--maguey-rose-tint) / <alpha-value>)'
                },
                amber: {
                    ...colors.amber,
                    DEFAULT: 'rgb(var(--maguey-amber) / <alpha-value>)',
                    bright: 'rgb(var(--maguey-amber-bright) / <alpha-value>)',
                    tint: 'rgb(var(--maguey-amber-tint) / <alpha-value>)'
                },

                // Domain blue — enfermedad / alergia / sustitución (flips in dark)
                blue: {
                    DEFAULT: 'rgb(var(--maguey-blue) / <alpha-value>)',
                    tint: 'rgb(var(--maguey-blue-tint) / <alpha-value>)'
                },

                // Ingredient food-group colors (Verdura/Fruta/Cereal/Lácteo/Condimento/Otros)
                food: {
                    verdura: 'rgb(var(--maguey-food-verdura) / <alpha-value>)',
                    fruta: 'rgb(var(--maguey-food-fruta) / <alpha-value>)',
                    cereal: 'rgb(var(--maguey-food-cereal) / <alpha-value>)',
                    lacteo: 'rgb(var(--maguey-food-lacteo) / <alpha-value>)',
                    condimento: 'rgb(var(--maguey-food-condimento) / <alpha-value>)',
                    otros: 'rgb(var(--maguey-food-otros) / <alpha-value>)'
                },

                // Paleta terrosa para charts (no cambia en dark)
                earth: {
                    forest: '#33604A',
                    olive: '#8A8A4E',
                    gold: '#C9A45C',
                    sienna: '#A9704F',
                    slate: '#5F7386',
                    sage: '#8FA98C',
                    clay: '#B0806A',
                    plum: '#7D6A85'
                },

                // 16-color muted palette for user-picked account/method colors
                user: {
                    marino: '#3B5F82',
                    teja: '#A64F4F',
                    bosque: '#4E8A6A',
                    ciruela: '#6A5A8C',
                    ambar: '#C08A4E',
                    laguna: '#58939C',
                    frambuesa: '#A85D6E',
                    acero: '#5F7386',
                    olivo: '#8A8A4E',
                    arcilla: '#B0806A',
                    ocre: '#C9A45C',
                    salvia: '#8FA98C',
                    malva: '#7D6A85',
                    indigo: '#56698F',
                    jade: '#3E7C74',
                    grafito: '#2E3A46'
                }
            },
            borderRadius            : {
                card: '12px',
                btn: '10px',
                field: '10px',
                compact: '8px',
                tile: '12px'
            },
            boxShadow               : {
                overlay: '0 12px 40px -8px rgb(23 32 27 / 0.28)'
            },
            flex                    : {
                '0': '0 0 auto'
            },
            fontFamily              : {
                sans: `"Inter var", ${defaultTheme.fontFamily.sans.join(',')}`,
                mono: `"IBM Plex Mono", ${defaultTheme.fontFamily.mono.join(',')}`
            },
            opacity                 : {
                12: '0.12',
                38: '0.38',
                87: '0.87'
            },
            rotate                  : {
                '-270': '270deg',
                '15'  : '15deg',
                '30'  : '30deg',
                '60'  : '60deg',
                '270' : '270deg'
            },
            scale                   : {
                '-1': '-1'
            },
            zIndex                  : {
                '-1'   : -1,
                '49'   : 49,
                '60'   : 60,
                '70'   : 70,
                '80'   : 80,
                '90'   : 90,
                '99'   : 99,
                '999'  : 999,
                '9999' : 9999,
                '99999': 99999
            },
            spacing                 : {
                '13': '3.25rem',
                '15': '3.75rem',
                '18': '4.5rem',
                '22': '5.5rem',
                '26': '6.5rem',
                '30': '7.5rem',
                '50': '12.5rem',
                '90': '22.5rem',

                // Bigger values
                '100': '25rem',
                '120': '30rem',
                '128': '32rem',
                '140': '35rem',
                '160': '40rem',
                '180': '45rem',
                '192': '48rem',
                '200': '50rem',
                '240': '60rem',
                '256': '64rem',
                '280': '70rem',
                '320': '80rem',
                '360': '90rem',
                '400': '100rem',
                '480': '120rem',

                // Fractional values
                '1/2': '50%',
                '1/3': '33.333333%',
                '2/3': '66.666667%',
                '1/4': '25%',
                '2/4': '50%',
                '3/4': '75%'
            },
            minHeight               : ({theme}) => ({
                ...theme('spacing')
            }),
            maxHeight               : {
                none: 'none'
            },
            minWidth                : ({theme}) => ({
                ...theme('spacing'),
                screen: '100vw'
            }),
            maxWidth                : ({theme}) => ({
                ...theme('spacing'),
                screen: '100vw'
            }),
            transitionDuration      : {
                '400': '400ms'
            },
            transitionTimingFunction: {
                'drawer': 'cubic-bezier(0.25, 0.8, 0.25, 1)'
            },

            // @tailwindcss/typography
            typography: ({theme}) => ({
                DEFAULT: {
                    css: {
                        color              : 'var(--mg-text-default)',
                        '[class~="lead"]'  : {
                            color: 'var(--mg-text-secondary)'
                        },
                        a                  : {
                            color: 'var(--mg-primary-500)'
                        },
                        strong             : {
                            color: 'var(--mg-text-default)'
                        },
                        'ol > li::before'  : {
                            color: 'var(--mg-text-secondary)'
                        },
                        'ul > li::before'  : {
                            backgroundColor: 'var(--mg-text-hint)'
                        },
                        hr                 : {
                            borderColor: 'var(--mg-border)'
                        },
                        blockquote         : {
                            color          : 'var(--mg-text-default)',
                            borderLeftColor: 'var(--mg-border)'
                        },
                        h1                 : {
                            color: 'var(--mg-text-default)'
                        },
                        h2                 : {
                            color: 'var(--mg-text-default)'
                        },
                        h3                 : {
                            color: 'var(--mg-text-default)'
                        },
                        h4                 : {
                            color: 'var(--mg-text-default)'
                        },
                        'figure figcaption': {
                            color: 'var(--mg-text-secondary)'
                        },
                        code               : {
                            color     : 'var(--mg-text-default)',
                            fontWeight: '500'
                        },
                        'a code'           : {
                            color: 'var(--mg-primary)'
                        },
                        pre                : {
                            color          : theme('colors.white'),
                            backgroundColor: theme('colors.gray.800')
                        },
                        thead              : {
                            color            : 'var(--mg-text-default)',
                            borderBottomColor: 'var(--mg-border)'
                        },
                        'tbody tr'         : {
                            borderBottomColor: 'var(--mg-border)'
                        },
                        'ol[type="A" s]'   : false,
                        'ol[type="a" s]'   : false,
                        'ol[type="I" s]'   : false,
                        'ol[type="i" s]'   : false
                    }
                },
                sm     : {
                    css: {
                        code : {
                            fontSize: '1em'
                        },
                        pre  : {
                            fontSize: '1em'
                        },
                        table: {
                            fontSize: '1em'
                        }
                    }
                }
            })
        }
    },
    corePlugins: {
        appearance        : false,
        container         : false,
        float             : false,
        clear             : false,
        placeholderColor  : false,
        placeholderOpacity: false,
        verticalAlign     : false
    },
    plugins    : [

        // Maguey - Tailwind plugins
        require(path.resolve(__dirname, ('src/@maguey/tailwind/plugins/utilities'))),
        require(path.resolve(__dirname, ('src/@maguey/tailwind/plugins/icon-size'))),
        require(path.resolve(__dirname, ('src/@maguey/tailwind/plugins/theming')))({themes}),
        require(path.resolve(__dirname, ('src/styles/maguey-theming.tailwind'))),

        // Other third party and/or custom plugins
        require('@tailwindcss/typography')({modifiers: ['sm', 'lg']})
    ]
};

module.exports = config;
