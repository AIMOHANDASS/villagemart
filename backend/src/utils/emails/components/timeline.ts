interface TimelineStep {
    label: string;
    description?: string;
    date?: string;
    completed: boolean;
}

export const Timeline = (steps: TimelineStep[]) => {
    let html = '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">';
    
    steps.forEach((step, index) => {
        const isLast = index === steps.length - 1;
        const color = step.completed ? "#16a34a" : "#d1d5db";
        const textColor = step.completed ? "#111827" : "#9ca3af";
        const descColor = step.completed ? "#6b7280" : "#9ca3af";
        const icon = step.completed ? "✓" : "";
        
        html += `
        <tr>
            <td width="30" valign="top" align="center">
                <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; color: white; font-size: 14px; line-height: 24px; text-align: center; font-weight: bold; font-family: 'Inter', sans-serif;">
                    ${icon}
                </div>
                ${!isLast ? `<div style="width: 2px; height: 100%; min-height: 40px; background-color: ${color}; margin-top: 4px; margin-bottom: 4px;"></div>` : ''}
            </td>
            <td valign="top" style="padding-left: 12px; padding-bottom: ${isLast ? '0' : '24px'};">
                <p style="margin: 2px 0 4px 0; font-size: 15px; font-weight: 600; color: ${textColor}; font-family: 'Inter', sans-serif;" class="text-dark">
                    ${step.label}
                </p>
                ${step.description ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: ${descColor}; font-family: 'Inter', sans-serif;" class="text-muted">${step.description}</p>` : ''}
                ${step.date ? `<p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: 'Inter', sans-serif;">${step.date}</p>` : ''}
            </td>
        </tr>
        `;
    });
    
    html += '</table>';
    return html;
};
