(()=>{
  const SUPABASE_URL='https://cpmmqqznrqeodlesyfgg.supabase.co';
  const SUPABASE_KEY='sb_publishable_gd9dgdqM4In8JFX9oFFJmQ_jDFGbR25';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const fn={core:'salon-link-core',apply:'salon-link-apply',offer:'salon-link-offer',accept:'salon-link-accept',work:'salon-link-work-status',review:'salon-link-review',chat:'salon-link-chat',safety:'salon-link-safety',admin:'salon-link-admin',member:'salon-link-salon-member',reminder:'salon-link-reminder'};
  async function invoke(name,body){
    const {data,error}=await client.functions.invoke(fn[name]||name,{body});
    if(error){let message=error.message||'通信に失敗しました';try{const ctx=await error.context?.json?.();message=ctx?.error?.message||message}catch{}const e=new Error(message);e.code='NETWORK_OR_API';throw e}
    if(!data?.ok){const e=new Error(data?.error?.message||'処理に失敗しました');e.code=data?.error?.code||'API_ERROR';throw e}
    return data.data;
  }
  const recData=r=>r?.data||{};
  const id=r=>r?.ref_id||r?.id;
  function mapBootstrap(raw){
    const favIds=(raw.favorites||[]).map(x=>x.data?.target_id).filter(Boolean);
    const reviews=raw.reviews||[];
    const ratingFor=userId=>{const xs=reviews.filter(r=>r.data?.target_user_id===userId);return xs.length?xs.reduce((s,r)=>s+Number(r.data.overall||0),0)/xs.length:null};
    const users=(raw.profiles||[]).map(r=>{const d=recData(r),rid=id(r),xs=reviews.filter(v=>v.data?.target_user_id===rid);return {id:rid,email:'',displayName:d.display_name||'ユーザー',fullName:d.display_name||'',roles:d.roles||[d.primary_role||'stylist'],area:d.prefecture||'',city:d.city||'',experience:Number(d.experience_years||0),verified:d.license_status==='approved'?'license':d.identity_status==='approved'?'identity':'none',identityVerified:d.identity_status==='approved',licenseVerified:d.license_status==='approved',identityStatus:d.identity_status||'unsubmitted',licenseStatus:d.license_status||'unsubmitted',avatarUrl:d.avatar_url||'',intro:d.bio||'',can:d.can_skills||[],learn:d.learn_skills||[],teach:d.teach_skills||[],minRate:Number(d.desired_rate||0),desiredAreas:d.desired_areas||[],portfolioUrl:d.portfolio_url||'',favorites:rid===id(raw.me)?favIds:[],rating:ratingFor(rid)||d.rating||null,reviewCount:xs.length||d.review_count||0,reviewMetrics:d.review_metrics||{},accountStatus:d.account_status||'active',notificationSettings:d.notification_settings||{}}});
    const salons=(raw.salons||[]).map(r=>{const d=recData(r);return {id:id(r),managerId:r.owner_id,verified:d.verification_status==='approved',verificationStatus:d.verification_status||'unsubmitted',name:d.name||'美容室',shortName:d.short_name||d.name||'美容室',area:d.prefecture||'',city:d.city||'',station:d.nearest_station||'',address:d.address||'',hours:d.business_hours||'',tags:d.tags||d.specialties||[],concept:d.description||'',seats:Number(d.seats||0),staff:Number(d.staff_count||0),audience:d.audience||'',specialty:d.specialties||[],coverUrl:d.cover_url||'',thumbUrl:d.logo_url||d.cover_url||'',dress:d.dress_code||'',website:d.website_url||'',sns:d.sns_url||''}});
    const salonBy=x=>salons.find(s=>s.id===x);
    const helps=(raw.helps||[]).map(r=>{const d=recData(r),s=salonBy(d.salon_id);return {id:id(r),title:d.title,date:d.work_date,start:String(d.start_time||'').slice(0,5),end:String(d.end_time||'').slice(0,5),salonId:d.salon_id,city:s?.city||'',role:d.target_role,count:Number(d.headcount||1),rate:Number(d.pay_amount||0),unit:d.pay_unit==='daily'?'日給':d.pay_unit==='fixed'?'固定':'時給',transport:d.transport||'',transportAmount:Number(d.transport_amount||0),breakTime:d.break_minutes==null?'未設定':`${d.break_minutes}分`,overtime:d.overtime||'',required:d.required_skills||[],welcome:d.preferred_skills||[],purposes:d.purposes||[],description:d.description||'',qualification:d.target_role==='stylist'?'美容師免許が必要です':'業務範囲に応じて確認',status:d.status,ownerId:r.owner_id,ownerType:d.recruiter_type,approvalStatus:'approved',learningWelcome:!!d.teaching_available,teach:d.teachable_skills||[],thingsToBring:d.things_to_bring||'',dressCode:d.dress_code||'',notes:d.notes||'',acceptedCount:Number(d.accepted_count||0),createdAt:r.created_at}});
    const availability=(raw.availability||[]).map(r=>{const d=recData(r);return {id:id(r),userId:r.owner_id,date:d.date,start:String(d.start_time||'').slice(0,5),end:String(d.end_time||'').slice(0,5),areas:d.areas||[],role:d.role,minRate:Number(d.desired_rate||0),skills:d.skills||[],learn:d.learn_skills||[],teach:d.teach_skills||[],note:d.note||'',status:d.status||'active',bookedMatchId:d.booked_match_id||null}});
    const applications=(raw.applications||[]).map(r=>({id:id(r),helpId:r.data.help_id,userId:r.owner_id,recruiterId:r.peer_id,message:r.data.message||'',status:r.data.status,createdAt:r.created_at}));
    const offers=(raw.offers||[]).map(r=>({id:id(r),helpId:r.data.help_id,userId:r.peer_id,fromUserId:r.owner_id,message:r.data.message||'',status:r.data.status,createdAt:r.created_at}));
    const matches=(raw.matches||[]).map(r=>({id:id(r),helpId:r.data.help_id,userId:r.owner_id,recruiterId:r.peer_id,salonId:r.data.salon_id,date:r.data.work_date,start:String(r.data.start_time||'').slice(0,5),end:String(r.data.end_time||'').slice(0,5),status:r.data.status,targetRole:r.data.target_role,cancelReason:r.data.cancel_reason||''}));
    const works=raw.work||[];
    const workPlans=matches.map(m=>{const w=works.find(x=>x.data.match_id===m.id)?.data||{};return {id:m.id,matchId:m.id,helpId:m.helpId,userId:m.userId,recruiterId:m.recruiterId,salonId:m.salonId,date:m.date,start:m.start,end:m.end,status:w.status==='completed'?'completed':w.status==='cancelled'?'cancelled':'planned',workStatus:w.status||'scheduled',matchStatus:m.status,endedAt:w.ended_at,completedAt:w.completed_at,cancelReason:m.cancelReason}});
    const conversations=(raw.conversations||[]).map(r=>({id:id(r),members:r.data.members||[r.owner_id,r.peer_id],helpId:r.data.help_id||null,matchId:r.data.match_id||null,type:r.data.type,updatedAt:r.updated_at}));
    const messages=(raw.messages||[]).map(r=>({id:id(r),conversationId:r.data.conversation_id,from:r.owner_id,text:r.data.body||'',at:r.created_at,read:!!r.data.read_at}));
    const reviewMapped=reviews.map(r=>({id:id(r),matchId:r.data.match_id,from:r.owner_id,to:r.data.target_user_id||r.data.target_salon_id,rating:Number(r.data.overall||0),metrics:{'時間厳守':r.data.punctuality,'コミュニケーション':r.data.communication,'技術・業務遂行':r.data.performance,'募集内容との一致':r.data.posting_accuracy,'働きやすさ':r.data.work_environment,'スタッフ対応':r.data.staff_response},comment:r.data.comment||'',visible:!r.data.hidden,targetType:r.data.target_type}));
    const notifications=(raw.notifications||[]).map(r=>({id:id(r),userId:r.owner_id,type:r.data.type,category:r.data.category||'お知らせ',title:r.data.title,body:r.data.body||'',read:!!r.data.read_at,at:r.created_at,resourceId:r.data.resource_id}));
    const salonMembers=(raw.salon_members||[]).map(r=>({id:id(r),userId:r.owner_id,salonId:r.data.salon_id,memberRole:r.data.member_role,approved:!!r.data.approved}));return {users,salons,helps,availability,applications,offers,matches,workPlans,conversations,messages,reviews:reviewMapped,notifications,reports:raw.reports||[],verifications:raw.verifications||[],blocks:raw.blocks||[],salonMembers,skillMaster:window.SALON_LINK_SEED?.skillMaster||[],learnMaster:window.SALON_LINK_SEED?.learnMaster||[],auditLogs:[],currentUserId:id(raw.me)};
  }
  window.SalonBackend={client,invoke,mapBootstrap,
    async getSession(){return (await client.auth.getSession()).data.session},
    async getUser(){return (await client.auth.getUser()).data.user},
    async signIn(email,password){const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data},
    async signUp(email,password,name,role){const{data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name,role}}});if(error)throw error;if(data.session)await invoke('core',{action:'ensure_profile',payload:{display_name:name,role}});return data},
    async ensureProfile(role,name){return invoke('core',{action:'ensure_profile',payload:{role,display_name:name}})},
    async bootstrap(){return mapBootstrap(await invoke('core',{action:'bootstrap'}))},
    async signOut(){return client.auth.signOut()},
    async resetPassword(email){const{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/#/settings'});if(error)throw error},
    async updateEmail(email){const{data,error}=await client.auth.updateUser({email});if(error)throw error;return data},
    async updatePassword(password){const{data,error}=await client.auth.updateUser({password});if(error)throw error;return data},
    core:(action,payload={})=>invoke('core',{action,payload}),
    apply:(action,payload={})=>invoke('apply',{action,payload}),
    offer:(action,payload={})=>invoke('offer',{action,payload}),
    accept:(type,id)=>invoke('accept',{payload:{type,id}}),
    work:(action,payload={})=>invoke('work',{action,payload}),
    review:(payload={})=>invoke('review',{payload}),
    chat:(action,payload={})=>invoke('chat',{action,payload}),
    safety:(action,payload={})=>invoke('safety',{action,payload}),
    admin:(action,payload={})=>invoke('admin',{action,payload}),
    requestHelpApproval:(payload={})=>invoke('sl-help-approval',{payload}),
    adminNotice:(payload={})=>invoke('salon-link-notice',{payload}),
    verificationDoc:(id)=>invoke('sl-doc',{payload:{id}}),
    member:(action,payload={})=>invoke('member',{action,payload}),
    reminder:()=>invoke('reminder',{action:'sync',payload:{}})
  };
})();
