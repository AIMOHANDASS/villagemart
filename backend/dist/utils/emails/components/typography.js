"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionTitle = exports.Text = exports.Heading = void 0;
const Heading = (text, level = 2, align = "left", color = "#111827") => {
    const sizes = { 1: "24px", 2: "20px", 3: "16px" };
    return `
        <h${level} class="text-dark" style="margin: 0 0 16px 0; font-size: ${sizes[level]}; font-weight: 700; color: ${color}; text-align: ${align}; font-family: 'Inter', sans-serif;">
            ${text}
        </h${level}>
    `;
};
exports.Heading = Heading;
const Text = (text, align = "left", isMuted = false, extraStyle = "") => {
    const color = isMuted ? "#6b7280" : "#374151";
    const cssClass = isMuted ? "text-muted" : "text-dark";
    return `
        <p class="${cssClass}" style="margin: 0 0 12px 0; font-size: 15px; line-height: 24px; color: ${color}; text-align: ${align}; font-family: 'Inter', sans-serif; ${extraStyle}">
            ${text}
        </p>
    `;
};
exports.Text = Text;
const SectionTitle = (text) => {
    return `
        <h3 class="text-dark" style="margin: 24px 0 12px 0; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">
            ${text}
        </h3>
    `;
};
exports.SectionTitle = SectionTitle;
