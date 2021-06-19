import _ from 'lodash'
import DailyRotateFile from 'winston-daily-rotate-file'
import winston from 'winston'
import { Inject, Injectable, LoggerService, Logger, Optional } from '@nestjs/common'
import { logOptions } from './logger.interface'
import { CONFIG_OPTIONS } from './logger.constants'

@Injectable()
export class MyLogger implements LoggerService {

    private transports: any[] = []
    private logLevel: string = 'info'
    private winstonLogger!: winston.Logger

    constructor(
        @Optional()
        @Inject(CONFIG_OPTIONS)
        private readonly options: logOptions,
    ) {
        const env = process.env.NODE_ENV || ''
        const { dir = '', errorMaxSize = 1024 * 1024 * 10, warnMaxSize = 1024 * 1024 * 10, infoMaxSize = 1024 * 1024 * 1000 } = this.options
        if (env === 'production' && dir) {
            this.transports.push(new DailyRotateFile({
                dirname: dir,
                filename: 'app.log.INFO.%DATE%',
                datePattern: 'YYYY-MM-DD',
                maxSize: infoMaxSize,
            }));
        
            this.transports.push(new winston.transports.File({
                level: 'info',
                filename: `${dir}/app.log.INFO`,
                maxsize: infoMaxSize
            }));
        
            this.transports.push(new winston.transports.File({
                level: 'warn',
                filename: `${dir}/app.log.WARN`,
                maxsize: warnMaxSize
            }));
        
            this.transports.push(new winston.transports.File({
                level: 'error',
                filename: `${dir}/app.log.ERROR`,
                maxsize: errorMaxSize
            }));

            this.winstonLogger = winston.createLogger({
                level: this.logLevel,
                transports: this.transports,
                format: winston.format.combine(
                    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                    winston.format.printf(({ timestamp, level, message, context = 'unknown', ...meta }) => {
                        level = _.toUpper(level);
                        return `${timestamp}\t${level}\t[${process.pid}]\t[${meta['ws-client-ip'] || '-'}]\t[${context}]\t[${meta['ws-request-id'] || '-'},${meta['ws-loginid'] || '-'},]\t[-]\t${message}\t${meta['logger-meta'] || ''}`;
                    }),
                ),
            })
        }
    }

    log(message: string, context?: string, isTimeDiffEnabled: boolean = true, meta?: { [key: string]: string | undefined }) {
        if (process.env.NODE_ENV === 'production' && this.options.dir) {
            this.winstonLogger.log('info', message, { ...meta, context })
            Logger.log(message, context, isTimeDiffEnabled)
        } else {
            Logger.log(message, context, isTimeDiffEnabled)
        }
    }

    error(message: string, trace: string, context?: string, isTimeDiffEnabled: boolean = false, meta?: { [key: string]: string | undefined }) {
        Logger.error(message, trace, context, isTimeDiffEnabled)
        if (process.env.NODE_ENV === 'production' && this.options.dir) {
            this.winstonLogger.log('error', message, { ...meta, context })
        }
    }

    warn(message: string, context?: string, isTimeDiffEnabled: boolean = false, meta?: { [key: string]: string | undefined }) {
        Logger.warn(message, context, isTimeDiffEnabled)
        if (process.env.NODE_ENV === 'production' && this.options.dir) {
            this.winstonLogger.log('warn', message, { ...meta, context })
        }
    }
    
}
