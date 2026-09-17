"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetEmail = exports.OTPVerificationEmail = exports.WelcomeEmail = void 0;
const components_1 = require("../components");
const WelcomeEmail = (username, loginLink) => {
    const content = `
        ${(0, components_1.EmailHeader)("Welcome to VillageSmart")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Welcome to the Family!", "Your registration is complete")}
                ${(0, components_1.Heading)(`Hello ${username}!`, 2, "left")}
                ${(0, components_1.Text)("We are absolutely thrilled to have you join VillageSmart. Our mission is to deliver the freshest agricultural goods and local products directly from villages straight to your household.", "left")}
                ${(0, components_1.Text)("Ready to explore our fresh marketplace? Click the button below to sign in and begin shopping.", "left")}
                ${(0, components_1.PrimaryButton)("Start Shopping", loginLink, "center")}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, "Welcome to VillageSmart!");
};
exports.WelcomeEmail = WelcomeEmail;
const OTPVerificationEmail = (otpCode, expiryTime = "10 minutes") => {
    const content = `
        ${(0, components_1.EmailHeader)("Verify Your Email")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.Heading)("Verification Required", 2, "center")}
                ${(0, components_1.Text)("Please use the secure authentication code below to verify your email address. This code is valid for a limited time.", "center")}
                ${(0, components_1.OTPCard)(otpCode, "Email Verification")}
                ${(0, components_1.Text)(`This code will expire in <strong>${expiryTime}</strong>. If you did not make this request, please disregard this email.`, "center", true)}
                ${(0, components_1.PrimaryButton)("Verify on VillageSmart", "https://villagesmart.in/profile", "center")}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, "Your VillageSmart Verification Code");
};
exports.OTPVerificationEmail = OTPVerificationEmail;
const PasswordResetEmail = (resetLink, otpCode, expiryTime = "15 minutes") => {
    const otpBlock = otpCode ? (0, components_1.OTPCard)(otpCode, "Reset OTP") : '';
    const content = `
        ${(0, components_1.EmailHeader)("Reset Your Password")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Password Reset Requested", `Requested for security verification`)}
                ${(0, components_1.Heading)("Password Reset Support", 2, "left")}
                ${(0, components_1.Text)("We received a request to reset the password linked to your VillageSmart account. To proceed, you can either click the button below or use the verification code provided.", "left")}
                
                ${otpBlock}
                
                ${(0, components_1.PrimaryButton)("Reset Password", resetLink, "center")}
                ${(0, components_1.Text)(`This reset request is valid for <strong>${expiryTime}</strong>. If you did not request this, please secure your account or contact our support team.`, "left", true)}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, "Reset Your VillageSmart Password");
};
exports.PasswordResetEmail = PasswordResetEmail;
