import app from "../src/app";

// No need for VercelRequest/VercelResponse
export default function handler(req: any, res: any) {
  return app(req, res);
}
