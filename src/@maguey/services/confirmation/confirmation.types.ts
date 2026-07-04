/**
 * Recursively removes optionality from every field of T.
 */
type DeepRequired<T> = { [K in keyof T]-?: DeepRequired<T[K]> };

export interface MagueyConfirmationConfig
{
    title?: string;
    message?: string;
    icon?: {
        show?: boolean;
        name?: string;
        color?: 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'success' | 'warning' | 'error';
    };
    actions?: {
        confirm?: {
            show?: boolean;
            label?: string;
            color?: 'primary' | 'accent' | 'warn';
        };
        cancel?: {
            show?: boolean;
            label?: string;
        };
    };
    dismissible?: boolean;
}

/**
 * Fully-resolved confirmation config.
 *
 * MagueyConfirmationService.open() deep-merges the caller's partial config into
 * its complete `_defaultConfig` before opening the dialog, so the dialog always
 * receives a config with every field present.
 */
export type MagueyConfirmationConfigResolved = DeepRequired<MagueyConfirmationConfig>;
