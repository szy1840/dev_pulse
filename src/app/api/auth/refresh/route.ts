import { createRefreshAuthRouter } from "@insforge/sdk/ssr";

// Browser SDK clients refresh their access token through this route.
export const { POST } = createRefreshAuthRouter();
