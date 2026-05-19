export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type LocalMedia = {
    serverId: string,
    name: string,
    localUrl: string,
    url: string,
    mimeType: string,
    type: MediaType,
    size: number
}