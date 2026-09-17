export const Heading = (text: string, level: 1 | 2 | 3 = 2, align: "left" | "center" | "right" = "left", color: string = "#111827") => {
    const sizes = { 1: "24px", 2: "20px", 3: "16px" };
    return `
        <h${level} class="text-dark" style="margin: 0 0 16px 0; font-size: ${sizes[level]}; font-weight: 700; color: ${color}; text-align: ${align}; font-family: 'Inter', sans-serif;">
            ${text}
        </h${level}>
    `;
};

export const Text = (text: string, align: "left" | "center" | "right" = "left", isMuted: boolean = false, extraStyle: string = "") => {
    const color = isMuted ? "#6b7280" : "#374151";
    const cssClass = isMuted ? "text-muted" : "text-dark";
    return `
        <p class="${cssClass}" style="margin: 0 0 12px 0; font-size: 15px; line-height: 24px; color: ${color}; text-align: ${align}; font-family: 'Inter', sans-serif; ${extraStyle}">
            ${text}
        </p>
    `;
};

export const SectionTitle = (text: string) => {
    return `
        <h3 class="text-dark" style="margin: 24px 0 12px 0; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
            ${text}
        </h3>
    `;
};
