import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT || 5005,
  databaseUrl: process.env.DATABASE_URL,
  imageUrl: process.env.IMAGE_URL || "http://localhost:5000",
  sendEmail: {
    email_from: process.env.EMAIL_FROM,
    brevo_pass: process.env.BREVO_PASS,
    brevo_email: process.env.BREVO_EMAIL,
  },
  jwt: {
    access: {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    },
    refresh: {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    },
    resetPassword: {
      expiresIn: process.env.JWT_RESET_PASS_ACCESS_EXPIRES_IN,
    },
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
  url: {
    image: process.env.IMAGE_URL,
    backend: process.env.BACKEND_URL,
    frontend: process.env.FRONTEND_URL,
  },
  verify: {
    email: process.env.VERIFY_EMAIL_LINK,
    resetPassUI: process.env.RESET_PASS_UI_LINK,
    resetPassLink: process.env.VERIFY_RESET_PASS_LINK,
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    // clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // redirectUri: process.env.GOOGLE_REDIRECT_URI,
    // serviceAccount: {
    //   type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || "service_account",
    //   projectId: process.env.GOOGLE_PROJECT_ID,
    //   privateKeyId: process.env.GOOGLE_PRIVATE_KEY_ID,
    //   privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    //   clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    //   clientId: process.env.GOOGLE_SERVICE_CLIENT_ID,
    //   authUri:
    //     process.env.GOOGLE_AUTH_URI ||
    //     "https://accounts.google.com/o/oauth2/auth",
    //   tokenUri:
    //     process.env.GOOGLE_TOKEN_URI || "https://oauth2.googleapis.com/token",
    //   authProviderX509CertUrl:
    //     process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL ||
    //     "https://www.googleapis.com/oauth2/v1/certs",
    //   clientX509CertUrl: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    // },
  },
};
