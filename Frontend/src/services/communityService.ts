import api from '../lib/api'
export type CommunityMember={id_subscriber:number;email:string;nombre?:string;fuente:string;estado:'activo'|'baja';consentimiento_en:string;baja_en?:string}
export type CampaignState='borrador'|'enviando'|'enviado'|'parcial'|'fallido'
export type MailMode='dry'|'test'|'live'
export type CommunityCampaign={id_campaign:number;asunto:string;contenido:string;estado:CampaignState;destinatarios:number;enviados:number;fallidos:number;creado_en:string;enviado_en?:string|null;modo_envio?:MailMode|null;error?:string|null}
export type CampaignStatus=CommunityCampaign&{pendientes:number;porcentaje:number;fallos:{subscriber_id:number;email:string;error?:string}[];mail_mode:MailMode}
export type MailInfo={mail_mode:MailMode;smtp_configured:boolean;public_base_url_configured:boolean}
export type CommunityQuery={q?:string;estado?:'activo'|'baja';fuente?:string;page?:number;limit?:number}
export type CommunityList=MailInfo&{members:CommunityMember[];total:number;page:number;limit:number;activos:number;bajas:number;campaigns:CommunityCampaign[]}
export const getCommunity=async(params:CommunityQuery={}):Promise<CommunityList>=>(await api.get('/community/admin',{params})).data
export const createCampaign=async(data:{asunto:string;contenido:string}):Promise<CommunityCampaign>=>(await api.post('/community/admin/campaigns',data)).data
export const updateCampaign=async(id:number,data:{asunto:string;contenido:string}):Promise<CommunityCampaign>=>(await api.put(`/community/admin/campaigns/${id}`,data)).data
export const deleteCampaign=async(id:number):Promise<void>=>{await api.delete(`/community/admin/campaigns/${id}`)}
export const getCampaignStatus=async(id:number):Promise<CampaignStatus>=>(await api.get(`/community/admin/campaigns/${id}`)).data
export const sendCampaign=async(id:number):Promise<{message:string;destinatarios:number;pendientes:number;modo:MailMode}>=>(await api.post(`/community/admin/campaigns/${id}/send`)).data
export const testCampaign=async(id:number,email?:string):Promise<{message:string;destinatario:string;modo:MailMode}>=>(await api.post(`/community/admin/campaigns/${id}/test`,email?{email}:{})).data
export const unsubscribeMember=async(id:number):Promise<void>=>{await api.patch(`/community/admin/members/${id}/baja`)}
export const exportMembersCsv=async(params:Omit<CommunityQuery,'page'|'limit'>={}):Promise<Blob>=>(await api.get('/community/admin/members/export',{params,responseType:'blob'})).data
export const errorMessage=(error:unknown,fallback:string):string=>{const data=(error as {response?:{data?:{message?:string;msg?:string}}})?.response?.data;return data?.message||data?.msg||fallback}
