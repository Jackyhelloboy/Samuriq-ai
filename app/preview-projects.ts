// Explicit layout previews, never live opportunities or client assignments.
export const previewProjects=[
 {id:'preview-hand-3d',title:'3D hand landmark labeling',category:'3D annotation',description:'Layout preview for frame-by-frame hand landmarks, occlusion notes and 3D annotation review.'},
 {id:'preview-video',title:'Video scene annotation',category:'Video labeling',description:'Layout preview for clip segmentation, action labels and quality-checked video annotation.'},
 {id:'preview-pov',title:'Everyday activity POV capture',category:'Human motion & POV',description:'Layout preview for guided first-person activities, capture instructions and submission evidence.'},
 {id:'preview-images',title:'Image segmentation & review',category:'Data annotation',description:'Layout preview for object masks, labeling guidelines and reviewer feedback.'},
 {id:'preview-evaluation',title:'Multilingual AI response review',category:'AI evaluation',description:'Layout preview for language-specific review tasks with project-defined quality criteria.'},
].map(j=>({...j,location:'Requirements set by client',pair:0,rate:'Demonstration only · not accepting applicants',active:0,targetStart:'',deadline:'',preview:true}));
