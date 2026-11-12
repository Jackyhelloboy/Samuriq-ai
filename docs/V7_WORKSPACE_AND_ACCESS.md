# V7 workspace and client-session architecture

## Interface

The real contributor home now uses `components/contributor-dashboard.tsx`. It presents one selected project, the next required action, pair-hour target, recent reviewed output, permanent pairing, evidence upload, TL contact and a separate payment overview. Profile editing remains a dedicated view. Contributors switch among their own projects with `?project=`; an unknown ID falls back to an owned application and cannot select someone else's records.

`workspace-v7.css` defines the shared role workspace typography, rail, controls, tables, status badges, spacing and responsive rules. Setup instructions are collapsed behind help controls. The sample workspaces demonstrate the same project/evidence/support hierarchy using synthetic data only. They grant no permissions and contain no client destination or real bank details.

The mobile drawer hides the background from focus while open, locks background scrolling, closes on navigation and supports Escape. Tables scroll inside their containers. Reduced-motion preferences are respected.

## One authorization path

Both the legacy `launchProject` action and the project desk call `accessibleProject`. The legacy action now redirects internally to the desk; it no longer provides a separate direct-to-client launch path.

Authorization checks the actual signed-in account and current project state. Current training/terms acceptance, approved application, verified community and permanent pairing remain required. TL-managed projects also require both participants in the same active team, an active TL and verified evidence-folder viewer access. Queries for those checks select only the two pair members and their two folders.

The desk issues a 72-character random session token valid for five minutes. Only its SHA-256 hash is stored. The token is bound to the account and project and can be consumed once with an atomic conditional update. Approval is checked again at consumption. A copied, expired, used or cross-account token cannot open a session. Session issuance is limited to 20 attempts per account/project per ten-minute window. Expired counters and old session tokens are cleared during issuance.

`POST /projects/launch` requires same-origin navigation, the current approval checks and the bound session token. GET does not launch work. Embedded mode rejects a browser-reported non-iframe destination. Separate-tab mode is off by default and requires the owner to explicitly enable the project setting; a forged `mode=external` value does not enable it.

The outer Worker rejects mismatched Origin headers before action dispatch and cancels the unused body. Requests declaring more than 4 MB are rejected. This is not a substitute for route-specific size checks or a production WAF/rate-limiting service.

## Independent client boundary

This portal cannot stop someone typing the independent client's address in Chrome or registering directly there. The client must enforce vendor invitations, allowed registrations, trusted SSO or signed vendor-session authorization to close that gap. Referrer checks, hidden links, iframes and disabled buttons cannot create that guarantee.

Likewise, the client must permit cross-origin embedding and the required microphone/camera permissions for recording to work inside the portal. If the client blocks framing, the coordinator must obtain a permitted access method or explicitly allow external sessions. The UI does not claim that an iframe is a protected proxy. No client credentials or recordings pass through the Samuriq server, and the portal does not inspect the client's cross-origin page.

## Performance scope

Static assets are bundled for the Worker/CDN. The home dashboard batches independent queries, limits list results and scopes private queries to the account/pair. Application-partner and team-member indexes support these lookups; expiry indexes support counter/session cleanup. Approval and role data are checked live rather than placed in a global cross-user cache.

The local integration test exercises twelve synthetic demo requests across six concurrent workers and atomic concurrent token claims. These checks are regression checks, not a production capacity or latency guarantee. Production traffic still needs measured monitoring and host-level protection; the portal cannot control load on the independent client's servers.

## Regression coverage

`test-v7.py` covers the new dashboard, consistent role demos, public URL isolation, one-use sessions, expiry/replay/account binding, approval revocation, iframe/external policy, cross-origin rejection, generation throttling and bounded synthetic concurrent requests. Existing platform, vendor, payment, leadership, V6 and pair-evidence suites preserve role isolation, permanent pairs, bank privacy, client-QC accounting, helper scopes and ticket retention.
