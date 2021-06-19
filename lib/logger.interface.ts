export interface logOptions {
    dir?: string,
    infoMaxSize?: number,
    warnMaxSize?: number,
    errorMaxSize?: number,
    metaOptions?: {
        userFlag?: string
    }
}
