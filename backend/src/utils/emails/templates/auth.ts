import { 
    EmailLayout, 
    EmailHeader, 
    EmailFooter, 
    Heading, 
    Text, 
    PrimaryButton, 
    OTPCard, 
    StatusBanner 
} from "../components";

export const WelcomeEmail = (username: string, loginLink: string) => {
    const content = `
        ${EmailHeader("Welcome to VillageSmart")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Welcome to the Family!", "Your registration is complete")}
                ${Heading(`Hello ${username}!`, 2, "left")}
                ${Text("We are absolutely thrilled to have you join VillageSmart. Our mission is to deliver the freshest agricultural goods and local products directly from villages straight to your household.", "left")}
                ${Text("Ready to explore our fresh marketplace? Click the button below to sign in and begin shopping.", "left")}
                ${PrimaryButton("Start Shopping", loginLink, "center")}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, "Welcome to VillageSmart!");
};

export const OTPVerificationEmail = (otpCode: string, expiryTime: string = "10 minutes") => {
    const content = `
        ${EmailHeader("Verify Your Email")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${Heading("Verification Required", 2, "center")}
                ${Text("Please use the secure authentication code below to verify your email address. This code is valid for a limited time.", "center")}
                ${OTPCard(otpCode, "Email Verification")}
                ${Text(`This code will expire in <strong>${expiryTime}</strong>. If you did not make this request, please disregard this email.`, "center", true)}
                ${PrimaryButton("Verify on VillageSmart", "https://villagesmart.in/profile", "center")}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, "Your VillageSmart Verification Code");
};

export const PasswordResetEmail = (resetLink: string, otpCode?: string, expiryTime: string = "15 minutes") => {
    const otpBlock = otpCode ? OTPCard(otpCode, "Reset OTP") : '';
    const content = `
        ${EmailHeader("Reset Your Password")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Password Reset Requested", `Requested for security verification`)}
                ${Heading("Password Reset Support", 2, "left")}
                ${Text("We received a request to reset the password linked to your VillageSmart account. To proceed, you can either click the button below or use the verification code provided.", "left")}
                
                ${otpBlock}
                
                ${PrimaryButton("Reset Password", resetLink, "center")}
                ${Text(`This reset request is valid for <strong>${expiryTime}</strong>. If you did not request this, please secure your account or contact our support team.`, "left", true)}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, "Reset Your VillageSmart Password");
};
