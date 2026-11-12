-- Owner-requested client destination change. Do not change financial terms or waive onboarding.
UPDATE projects SET client_url='https://webrtcsg.shenfei-rec.com/index',invite_code='IMCIAD',external_allowed=0,onboarding_required=1,enrollment_only=CASE WHEN (tutorial_url<>'' OR register_url<>'') AND community_url<>'' AND terms<>'' THEN 0 ELSE 1 END WHERE id='speech-pair';
