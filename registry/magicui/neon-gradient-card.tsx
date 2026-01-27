"use client";

import {
    CSSProperties,
    ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface NeonColorsProps {
    firstColor: string;
    secondColor: string;
}

interface NeonGradientCardProps {
    /**
     * @default <div />
     * @type ReactNode
     * @description The content of the card
     */
    children?: ReactNode;

    /**
     * @default ""
     * @type string
     * @description The className of the card
     */
    className?: string;

    /**
     * @default 2
     * @type number
     * @description The size of the border in pixels
     */
    borderSize?: number;

    /**
     * @default 20
     * @type number
     * @description The size of the borderRadius in pixels
     */
    borderRadius?: number;

    /**
     * @default "{ firstColor: '#ff2975', secondColor: '#00FFF1' }"
     * @type NeonColorsProps
     * @description The colors of the neon gradient
     */
    neonColors?: NeonColorsProps;

    innerClassName?: string;

    [key: string]: any;
}

/**
 * @name Neon Gradient Card
 * @description A card with a neon gradient border
 */
const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
    className,
    children,
    borderSize = 4,
    borderRadius = 24,
    neonColors = {
        firstColor: "#ff2975",
        secondColor: "#00FFF1",
    },
    innerClassName,
    ...props
}) => {
    return (
        <div
            style={
                {
                    "--border-size": `${borderSize}px`,
                    "--border-radius": `${borderRadius}px`,
                    "--neon-first-color": neonColors.firstColor,
                    "--neon-second-color": neonColors.secondColor,
                    "--pseudo-element-background-image": `linear-gradient(0deg, ${neonColors.firstColor}, ${neonColors.secondColor})`,
                    ...props.style
                } as CSSProperties
            }
            className={cn(
                "relative z-10 size-full rounded-[var(--border-radius)] group cursor-pointer",
                className,
            )}
            {...props}
        >
            <div
                className={cn(
                    "relative size-full min-h-[inherit] rounded-[calc(var(--border-radius)-1px)] bg-white dark:bg-zinc-900 overflow-visible",
                    "before:absolute before:-inset-[var(--border-size)] before:-z-10 before:block",
                    "before:rounded-[var(--border-radius)] before:content-['']",
                    "before:bg-[var(--pseudo-element-background-image)] before:bg-[length:100%_200%] before:animate-background-position-spin",
                    "before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500",
                    "after:absolute after:-inset-[var(--border-size)] after:-z-10 after:block",
                    "after:rounded-[var(--border-radius)] after:blur-2xl after:content-['']",
                    "after:bg-[var(--pseudo-element-background-image)] after:bg-[length:100%_200%] after:opacity-0 group-hover:after:opacity-60 after:animate-background-position-spin",
                    "after:transition-opacity after:duration-500",
                    innerClassName
                )}
            >
                {children}
            </div>
        </div>
    );
};

export { NeonGradientCard };
