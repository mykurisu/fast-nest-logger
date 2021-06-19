import { Inject, Injectable, NestMiddleware, Req, Res, Optional } from '@nestjs/common'
import { Request, Response } from 'express'
import bytes from 'bytes'
import { MyLogger } from './logger.service'
import { CONFIG_OPTIONS } from './logger.constants'
import { logOptions } from './logger.interface'


const randomString = (length: number, chars: string): string => {
    let mask: string = ''
    if (chars.indexOf('a') > -1) { mask += 'abcdefghijklmnopqrstuvwxyz' }
    if (chars.indexOf('A') > -1) { mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }
    if (chars.indexOf('#') > -1) { mask += '0123456789' }
    if (chars.indexOf('!') > -1) { mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\' }
    let result: string = ''
    for (let i: number = length; i > 0; i -= 1) { result += mask[Math.floor(Math.random() * mask.length)] }
    return result
}


@Injectable()
export class LoggerMiddleware implements NestMiddleware<any, any> {

    constructor(
        @Optional()
        @Inject(CONFIG_OPTIONS)
        private readonly options: logOptions,
        private readonly myLogger: MyLogger,
    ) {}

    async use(@Req() req: Request, @Res() res: Response, next: Function) {
        const startTime: number = Date.now()
        const url: string = req.baseUrl
        const requestId = randomString(6, 'Aa#')
        const user: string = this.options?.metaOptions?.userFlag ? String(req.headers[this.options.metaOptions.userFlag] || 'unknown') : 'unknown'
        const referer: string = req.headers.referer || ''
        this.myLogger.log(`[${user}]\n[${requestId}] ${req.method} --> ${url} ${referer ? `\n[${requestId}] FURL --> ${referer}` : ''}`, 'logger.middleware', false, { 'ws-request-id': requestId, 'ws-loginid': user })

        try {
            await next()
        } catch (error) {
            this.myLogger.error(`[${user}]\n[${requestId}] ${req.method} <-- ${res.statusCode} ${url} ${referer ? `\n[${requestId}] FURL --> ${referer}` : ''}`, error, 'logger.middleware', false, { 'ws-request-id': requestId, 'ws-loginid': user })
            throw error
        }

        const onFinish = () => {
            const finishTime: number = Date.now()
            const { statusCode } = res
            let length: string
            if (~[204, 205, 304].indexOf(statusCode)) {
                length = ''
            } else {
                const l = Number(res.getHeader('content-length'))
                length = bytes(l) ? bytes(l).toLowerCase() : ''
            }
            this.myLogger.log(`[${user}]\n[${requestId}] ${req.method} <-- ${res.statusCode} ${url} ${referer ? `\n[${requestId}] FURL --> ${referer}` : ''} ${(finishTime - startTime) + 'ms'}`, 'logger.middleware', false, { 'ws-request-id': requestId, 'ws-loginid': user })
        }

        res.once('finish', () => {
            onFinish()
            res.removeListener('finish', onFinish)
        })
    }
}
