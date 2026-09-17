"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailHeader = void 0;
const EmailHeader = (title = "VillageSmart") => `
<tr>
    <td align="center" style="background-color: #16a34a; background: linear-gradient(135deg, #16a34a, #15803d); padding: 32px 24px;">
        <table border="0" cellspacing="0" cellpadding="0" align="center">
            <tr>
                <td align="center" style="padding-bottom: 12px;">
                    <!-- VillageSmart Centered Logo -->
                    <a href="https://villagesmart.in" target="_blank" style="text-decoration: none; border: none; outline: none; display: inline-block;">
                        <img
                        src="https://villagesmart.in/logo.png"
                        alt="VillageSmart"
                        width="70"
                        height="70"
                        style="
                        display:block;
                        margin:auto;
                        border:0;
                        outline:none;
                        text-decoration:none;
                        max-width:70px;
                        height:auto;
                        "
                        />
                    </a>
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        ${title}
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #dcfce7; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Fresh from Villages
                    </p>
                </td>
            </tr>
        </table>
    </td>
</tr>
`;
exports.EmailHeader = EmailHeader;
