import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    // Reject cross-origin writes before framework dispatch. Drain only declared
    // small bodies so a rejected form cannot stall the next local Worker request.
    // Large/unknown bodies are left to the HTTP runtime, without parsing them.
    const origin=request.headers.get('origin');
    if(!['GET','HEAD','OPTIONS'].includes(request.method)&&origin&&origin!==new URL(request.url).origin){
      const size=Number(request.headers.get('content-length')||0);
      if(size>0&&size<=8192)await request.arrayBuffer();
      return new Response('Invalid origin',{status:403,headers:{'Cache-Control':'no-store'}});
    }
    if(Number(request.headers.get('content-length')||0)>4*1024*1024){
      return new Response('Request is too large',{status:413});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
