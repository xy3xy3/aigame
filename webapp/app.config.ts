export default defineAppConfig({
    ui: {
        navigationMenu: {
            slots: {
                root: 'relative flex gap-1.5 [&>div]:min-w-0',
                list: 'isolate min-w-0',
                label: 'w-full flex items-center gap-1.5 font-semibold text-xs/5 text-gray-700 px-2.5 py-1.5',
                item: 'min-w-0',
                link: 'group relative w-full flex items-center gap-1.5 font-medium text-sm before:absolute before:z-[-1] before:rounded-md focus:outline-none focus-visible:outline-none dark:focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2',
                linkLeadingIcon: 'shrink-0 size-5',
                linkLeadingAvatar: 'shrink-0',
                linkLeadingAvatarSize: '2xs',
                linkTrailing: 'group ms-auto inline-flex gap-1.5 items-center',
                linkTrailingBadge: 'shrink-0',
                linkTrailingBadgeSize: 'sm',
                linkTrailingIcon: 'size-5 transform shrink-0 group-data-[state=open]:rotate-180 transition-transform duration-200',
                linkLabel: 'truncate text-gray-700',
                linkLabelExternalIcon: 'inline-block size-3 align-top text-gray-500',
                childList: 'isolate overflow-hidden',
                childLabel: 'text-xs text-gray-700',
                childItem: '',
                childLink: 'group relative size-full flex items-start text-start text-sm before:absolute before:z-[-1] before:rounded-md focus:outline-none focus-visible:outline-none dark:focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2',
                childLinkWrapper: 'min-w-0',
                childLinkIcon: 'size-5 shrink-0',
                childLinkLabel: 'truncate text-gray-700',
                childLinkLabelExternalIcon: 'inline-block size-3 align-top text-gray-500',
                childLinkDescription: 'text-gray-600',
                separator: 'px-2 h-px bg-border',
                viewportWrapper: 'absolute top-full left-0 flex w-full',
                viewport: 'relative overflow-hidden bg-white shadow-lg rounded-md ring ring-gray-200 h-(--reka-navigation-menu-viewport-height) w-full transition-[width,height,left] duration-200 origin-[top_center] data-[state=open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] z-[1]',
                content: 'overflow-hidden rounded-md',
                indicator: 'absolute data-[state=visible]:animate-[fade-in_100ms_ease-out] data-[state=hidden]:animate-[fade-out_100ms_ease-in] data-[state=hidden]:opacity-0 bottom-0 z-[2] w-(--reka-navigation-menu-indicator-size) translate-x-(--reka-navigation-menu-indicator-position) flex h-2.5 items-end justify-center overflow-hidden transition-[translate,width] duration-200',
                arrow: 'relative top-[50%] size-2.5 rotate-45 border border-gray-200 bg-white z-[1] rounded-xs'
            },
            variants: {
                color: {
                    primary: {
                        link: 'focus-visible:before:ring-primary',
                        childLink: 'focus-visible:before:ring-primary'
                    },
                    secondary: {
                        link: 'focus-visible:before:ring-secondary',
                        childLink: 'focus-visible:before:ring-secondary'
                    },
                    success: {
                        link: 'focus-visible:before:ring-success',
                        childLink: 'focus-visible:before:ring-success'
                    },
                    info: {
                        link: 'focus-visible:before:ring-info',
                        childLink: 'focus-visible:before:ring-info'
                    },
                    warning: {
                        link: 'focus-visible:before:ring-warning',
                        childLink: 'focus-visible:before:ring-warning'
                    },
                    error: {
                        link: 'focus-visible:before:ring-error',
                        childLink: 'focus-visible:before:ring-error'
                    },
                    neutral: {
                        link: 'focus-visible:before:ring-gray-400',
                        childLink: 'focus-visible:before:ring-gray-400'
                    }
                },
                highlightColor: {
                    primary: '',
                    secondary: '',
                    success: '',
                    info: '',
                    warning: '',
                    error: '',
                    neutral: ''
                },
                variant: {
                    pill: '',
                    link: ''
                },
                orientation: {
                    horizontal: {
                        root: 'items-center justify-between',
                        list: 'flex items-center',
                        item: 'py-2',
                        link: 'px-2.5 py-1.5 before:inset-1 before:rounded-md',
                        childList: 'grid p-2 overflow-hidden',
                        childLink: 'px-3 py-2 gap-2 before:inset-1 before:rounded-md',
                        childLinkLabel: 'font-medium text-gray-700',
                        content: 'absolute top-0 left-0 w-full max-h-[70vh] overflow-hidden'
                    },
                    vertical: {
                        root: 'flex-col',
                        link: 'flex-row px-2.5 py-1.5 before:inset-y-px before:inset-x-0',
                        childLabel: 'px-1.5 py-0.5',
                        childLink: 'p-1.5 gap-1.5 before:inset-y-px before:inset-x-0'
                    }
                },
                contentOrientation: {
                    horizontal: {
                        viewportWrapper: 'justify-center',
                        content: 'data-[motion=from-start]:animate-[enter-from-left_200ms_ease] data-[motion=from-end]:animate-[enter-from-right_200ms_ease] data-[motion=to-start]:animate-[exit-to-left_200ms_ease] data-[motion=to-end]:animate-[exit-to-right_200ms_ease]'
                    },
                    vertical: {
                        viewport: 'sm:w-(--reka-navigation-menu-viewport-width) left-(--reka-navigation-menu-viewport-left)'
                    }
                },
                active: {
                    true: {
                        childLink: 'before:bg-blue-100 text-gray-700',
                        childLinkIcon: 'text-gray-700',
                        childLinkLabel: 'text-gray-700'
                    },
                    false: {
                        link: 'text-gray-700',
                        linkLeadingIcon: 'text-gray-600',
                        childLink: [
                            'hover:before:bg-gray-100 text-gray-700 hover:text-gray-900',
                            'transition-colors before:transition-colors'
                        ],
                        childLinkIcon: [
                            'text-gray-600 group-hover:text-gray-700',
                            'transition-colors'
                        ],
                        childLinkLabel: 'text-gray-700 group-hover:text-gray-900'
                    }
                },
                disabled: {
                    true: {
                        link: 'cursor-not-allowed opacity-75'
                    }
                },
                highlight: {
                    true: ''
                },
                level: {
                    true: ''
                },
                collapsed: {
                    true: ''
                }
            },
            compoundVariants: [
                {
                    orientation: 'horizontal',
                    contentOrientation: 'horizontal',
                    class: {
                        childList: 'grid-cols-2 gap-1 overflow-hidden'
                    }
                },
                {
                    orientation: 'horizontal',
                    contentOrientation: 'vertical',
                    class: {
                        childList: 'gap-1 overflow-hidden',
                        content: 'w-60'
                    }
                },
                {
                    orientation: 'vertical',
                    collapsed: false,
                    class: {
                        childList: 'ms-5 border-s border-gray-200',
                        childItem: 'ps-1.5 -ms-px',
                        content: 'data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out] overflow-hidden'
                    }
                },
                {
                    orientation: 'vertical',
                    collapsed: true,
                    class: {
                        link: 'px-1.5',
                        content: 'shadow-sm rounded-sm min-h-6 p-1'
                    }
                },
                {
                    orientation: 'horizontal',
                    highlight: true,
                    class: {
                        link: [
                            'after:absolute after:-bottom-2 after:inset-x-2.5 after:block after:h-px after:rounded-full',
                            'after:transition-colors'
                        ]
                    }
                },
                {
                    orientation: 'vertical',
                    highlight: true,
                    level: true,
                    class: {
                        link: [
                            'after:absolute after:-start-1.5 after:inset-y-0.5 after:block after:w-px after:rounded-full',
                            'after:transition-colors'
                        ]
                    }
                },
                {
                    disabled: false,
                    active: false,
                    variant: 'pill',
                    class: {
                        link: [
                            'hover:text-gray-900 hover:before:bg-gray-100',
                            'transition-colors before:transition-colors'
                        ],
                        linkLeadingIcon: [
                            'group-hover:text-gray-700',
                            'transition-colors'
                        ]
                    }
                },
                {
                    disabled: false,
                    active: false,
                    variant: 'pill',
                    orientation: 'horizontal',
                    class: {
                        link: 'data-[state=open]:text-gray-900',
                        linkLeadingIcon: 'group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    disabled: false,
                    variant: 'pill',
                    highlight: true,
                    orientation: 'horizontal',
                    class: {
                        link: 'data-[state=open]:before:bg-gray-100'
                    }
                },
                {
                    disabled: false,
                    variant: 'pill',
                    highlight: false,
                    active: false,
                    orientation: 'horizontal',
                    class: {
                        link: 'data-[state=open]:before:bg-gray-100'
                    }
                },
                {
                    color: 'primary',
                    variant: 'pill',
                    active: true,
                    class: {
                        link: 'text-gray-700',
                        linkLeadingIcon: 'text-gray-700 group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    color: 'neutral',
                    variant: 'pill',
                    active: true,
                    class: {
                        link: 'text-gray-700',
                        linkLeadingIcon: 'text-gray-700 group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    variant: 'pill',
                    active: true,
                    highlight: false,
                    class: {
                        link: 'before:bg-blue-100'
                    }
                },
                {
                    variant: 'pill',
                    active: true,
                    highlight: true,
                    disabled: false,
                    class: {
                        link: [
                            'hover:before:bg-blue-200',
                            'before:transition-colors'
                        ]
                    }
                },
                {
                    disabled: false,
                    active: false,
                    variant: 'link',
                    class: {
                        link: [
                            'hover:text-gray-900',
                            'transition-colors'
                        ],
                        linkLeadingIcon: [
                            'group-hover:text-gray-700',
                            'transition-colors'
                        ]
                    }
                },
                {
                    disabled: false,
                    active: false,
                    variant: 'link',
                    orientation: 'horizontal',
                    class: {
                        link: 'data-[state=open]:text-gray-900',
                        linkLeadingIcon: 'group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    color: 'primary',
                    variant: 'link',
                    active: true,
                    class: {
                        link: 'text-gray-700',
                        linkLeadingIcon: 'text-gray-700 group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    color: 'neutral',
                    variant: 'link',
                    active: true,
                    class: {
                        link: 'text-gray-700',
                        linkLeadingIcon: 'text-gray-700 group-data-[state=open]:text-gray-700'
                    }
                },
                {
                    highlightColor: 'primary',
                    highlight: true,
                    level: true,
                    active: true,
                    class: {
                        link: 'after:bg-primary'
                    }
                },
                {
                    highlightColor: 'neutral',
                    highlight: true,
                    level: true,
                    active: true,
                    class: {
                        link: 'after:bg-gray-700'
                    }
                }
            ],
            defaultVariants: {
                color: 'primary',
                highlightColor: 'primary',
                variant: 'pill'
            }
        }
    }
})