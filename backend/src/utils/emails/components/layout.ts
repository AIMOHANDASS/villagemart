export const EmailLayout = (content: string, preheader: string = "VillageSmart Notification") => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>VillageSmart</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            background-color: #f4f6f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
        }
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        td {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        img {
            border: 0;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
            max-width: 100%;
            display: block;
        }
        a {
            color: #16a34a;
            text-decoration: none;
        }
        .container {
            width: 100%;
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }
        .inner-content {
            padding: 32px;
        }
        @media only screen and (max-width: 650px) {
            .container {
                width: 100% !important;
                border-radius: 0 !important;
            }
            .inner-content {
                padding: 20px !important;
            }
            .mobile-full-width {
                width: 100% !important;
            }
        }
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #0f172a !important;
                color: #f1f5f9 !important;
            }
            .container {
                background-color: #1e293b !important;
            }
            .card {
                background-color: #334155 !important;
                border-color: #475569 !important;
            }
            .text-muted {
                color: #94a3b8 !important;
            }
            .text-dark {
                color: #f8fafc !important;
            }
            .border-divider {
                border-color: #334155 !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8;">
    <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </span>
    
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 24px 0;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table class="container" width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px;">
                    ${content}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
