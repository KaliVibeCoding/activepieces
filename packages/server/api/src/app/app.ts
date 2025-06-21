import { ApplicationEventName, AuthenticationEvent, ConnectionEvent, FlowCreatedEvent, FlowDeletedEvent, FlowRunEvent, FolderEvent, GitRepoWithoutSensitiveData, ProjectMember, ProjectReleaseEvent, ProjectRoleEvent, SigningKeyEvent, SignUpEvent } from '@kvc/ee-shared' // KVC: Scope updated
import { PieceMetadata } from '@kvc/pieces-framework' // KVC: Scope updated
import { AppSystemProp, exceptionHandler, rejectedPromiseHandler } from '@kvc/server-shared' // KVC: Scope updated
import { ApEdition, ApEnvironment, AppConnectionWithoutSensitiveData, Flow, FlowRun, FlowTemplate, Folder, isNil, McpPieceWithConnection, McpWithPieces, ProjectRelease, ProjectWithLimits, spreadIfDefined, UserInvitation } from '@kvc/shared' // KVC: Scope updated
import swagger from '@fastify/swagger'
import { createAdapter } from '@socket.io/redis-adapter'
import { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify'
import fastifySocketIO from 'fastify-socket.io'
import { Socket } from 'socket.io'
import { aiProviderModule } from './ai/ai-provider.module'
import { setPlatformOAuthService } from './app-connection/app-connection-service/oauth2'
import { appConnectionModule } from './app-connection/app-connection.module'
import { appEventRoutingModule } from './app-event-routing/app-event-routing.module'
import { authenticationModule } from './authentication/authentication.module'
import { accessTokenManager } from './authentication/lib/access-token-manager'
import { changelogModule } from './changelog/changelog.module'
import { copilotModule } from './copilot/copilot.module'
import { rateLimitModule } from './core/security/rate-limit'
import { securityHandlerChain } from './core/security/security-handler-chain'
import { getRedisConnection } from './database/redis-connection'
import { alertsModule } from './ee/alerts/alerts-module'
import { analyticsModule } from './ee/analytics/analytics.module'
import { apiKeyModule } from './ee/api-keys/api-key-module'
import { platformOAuth2Service } from './ee/app-connections/platform-oauth2-service'
import { appCredentialModule } from './ee/app-credentials/app-credentials.module'
import { auditEventModule } from './ee/audit-logs/audit-event-module'
import { auditLogService } from './ee/audit-logs/audit-event-service'
import { enterpriseLocalAuthnModule } from './ee/authentication/enterprise-local-authn/enterprise-local-authn-module'
import { federatedAuthModule } from './ee/authentication/federated-authn/federated-authn-module'
import { otpModule } from './ee/authentication/otp/otp-module'
import { rbacMiddleware } from './ee/authentication/project-role/rbac-middleware'
import { authnSsoSamlModule } from './ee/authentication/saml-authn/authn-sso-saml-module'
import { appSumoModule } from './ee/billing/appsumo/appsumo.module'
import { connectionKeyModule } from './ee/connection-keys/connection-key.module'
import { customDomainModule } from './ee/custom-domains/custom-domain.module'
import { domainHelper } from './ee/custom-domains/domain-helper'
import { enterpriseFlagsHooks } from './ee/flags/enterprise-flags.hooks'
import { platformRunHooks } from './ee/flow-run/cloud-flow-run-hooks'
import { platformFlowTemplateModule } from './ee/flow-template/platform-flow-template.module'
import { globalConnectionModule } from './ee/global-connections/global-connection-module'
import { emailService } from './ee/helper/email/email-service'
import { licenseKeysModule } from './ee/license-keys/license-keys-module'
import { managedAuthnModule } from './ee/managed-authn/managed-authn-module'
import { oauthAppModule } from './ee/oauth-apps/oauth-app.module'
import { adminPieceModule } from './ee/pieces/admin-piece-module'
import { enterprisePieceMetadataServiceHooks } from './ee/pieces/filters/enterprise-piece-metadata-service-hooks'
import { platformPieceModule } from './ee/pieces/platform-piece-module'
import { adminPlatformModule } from './ee/platform/admin-platform.controller'
import { platformBillingModule } from './ee/platform-billing/platform-billing.module'
import { projectMemberModule } from './ee/project-members/project-member.module'
import { gitRepoModule } from './ee/project-release/git-sync/git-sync.module'
import { projectReleaseModule } from './ee/project-release/project-release.module'
import { projectRoleModule } from './ee/project-role/project-role.module'
import { projectEnterpriseHooks } from './ee/projects/ee-project-hooks'
import { platformProjectModule } from './ee/projects/platform-project-module'
import { signingKeyModule } from './ee/signing-key/signing-key-module'
import { todoCommentModule } from './ee/todos/comment/todos-comment.module'
import { usageTrackerModule } from './ee/usage-tracker/usage-tracker-module'
import { userModule } from './ee/users/user.module'
import { fileModule } from './file/file.module'
import { flagModule } from './flags/flag.module'
import { flagHooks } from './flags/flags.hooks'
import { communityFlowTemplateModule } from './flow-templates/community-flow-template.module'
import { humanInputModule } from './flows/flow/human-input/human-input.module'
import { flowRunHooks } from './flows/flow-run/flow-run-hooks'
import { flowRunModule } from './flows/flow-run/flow-run-module'
import { flowModule } from './flows/flow.module'
import { folderModule } from './flows/folder/folder.module'
import { issuesModule } from './flows/issues/issues-module'
import { triggerEventModule } from './flows/trigger-events/trigger-event.module'
import { eventsHooks } from './helper/application-events'
import { openapiModule } from './helper/openapi/openapi.module'
import { QueueMode, system } from './helper/system/system'
import { systemJobsSchedule } from './helper/system-jobs'
import { SystemJobName } from './helper/system-jobs/common'
import { systemJobHandlers } from './helper/system-jobs/job-handlers'
import { validateEnvPropsOnStartup } from './helper/system-validator'
import { mcpModule } from './mcp/mcp-module'
import { pieceModule } from './pieces/base-piece-module'
import { communityPiecesModule } from './pieces/community-piece-module'
import { pieceMetadataServiceHooks } from './pieces/piece-metadata-service/hooks'
import { pieceSyncService } from './pieces/piece-sync-service'
import { platformModule } from './platform/platform.module'
import { platformService } from './platform/platform.service'
import { projectHooks } from './project/project-hooks'
import { projectModule } from './project/project-module'
import { storeEntryModule } from './store-entry/store-entry.module'
import { tablesModule } from './tables/tables.module'
import { tagsModule } from './tags/tags-module'
import { todoModule } from './todos/todo.module'
import { platformUserModule } from './user/platform/platform-user-module'
import { invitationModule } from './user-invitations/user-invitation.module'
import { webhookModule } from './webhooks/webhook-module'
import { websocketService } from './websockets/websockets.service'
import { flowConsumer } from './workers/consumer'
import { engineResponseWatcher } from './workers/engine-response-watcher'
import { workerModule } from './workers/worker-module'
export const setupApp = async (app: FastifyInstance): Promise<FastifyInstance> => {

    await app.register(swagger, {
        hideUntagged: true,
        openapi: {
            servers: [
                {
                    url: 'https://cloud.kalivibecoding.com/api', // KVC: URL updated
                    description: 'KVC Production Server', // KVC: Description updated
                },
            ],
            components: {
                securitySchemes: {
                    apiKey: {
                        type: 'http',
                        description: 'Use your KVC API key generated from the admin console', // KVC: Description updated
                        scheme: 'bearer',
                    },
                },
                schemas: {
                    [ApplicationEventName.FLOW_CREATED]: FlowCreatedEvent,
                    [ApplicationEventName.FLOW_DELETED]: FlowDeletedEvent,
                    [ApplicationEventName.CONNECTION_UPSERTED]: ConnectionEvent,
                    [ApplicationEventName.CONNECTION_DELETED]: ConnectionEvent,
                    [ApplicationEventName.FOLDER_CREATED]: FolderEvent,
                    [ApplicationEventName.FOLDER_UPDATED]: FolderEvent,
                    [ApplicationEventName.FOLDER_DELETED]: FolderEvent,
                    [ApplicationEventName.FLOW_RUN_STARTED]: FlowRunEvent,
                    [ApplicationEventName.FLOW_RUN_FINISHED]: FlowRunEvent,
                    [ApplicationEventName.USER_SIGNED_UP]: SignUpEvent,
                    [ApplicationEventName.USER_SIGNED_IN]: AuthenticationEvent,
                    [ApplicationEventName.USER_PASSWORD_RESET]: AuthenticationEvent,
                    [ApplicationEventName.USER_EMAIL_VERIFIED]: AuthenticationEvent,
                    [ApplicationEventName.SIGNING_KEY_CREATED]: SigningKeyEvent,
                    [ApplicationEventName.PROJECT_ROLE_CREATED]: ProjectRoleEvent,
                    [ApplicationEventName.PROJECT_RELEASE_CREATED]: ProjectReleaseEvent,
                    'flow-template': FlowTemplate, // KVC: Consider 'blueprint-template'
                    'folder': Folder,
                    'user-invitation': UserInvitation,
                    'project-member': ProjectMember,
                    project: ProjectWithLimits,
                    flow: Flow, // KVC: Consider 'sequence'
                    'flow-run': FlowRun, // KVC: Consider 'sequence-run'
                    'app-connection': AppConnectionWithoutSensitiveData, // KVC: Consider 'kvc-connection'
                    piece: PieceMetadata, // KVC: Consider 'connector' or 'kvc-piece'
                    'git-repo': GitRepoWithoutSensitiveData,
                    'project-release': ProjectRelease,
                    'global-connection': AppConnectionWithoutSensitiveData,
                    'mcp': McpWithPieces,
                    'mcp-piece': McpPieceWithConnection,
                },
            },
            info: {
                title: 'KaliVibeCoding API Documentation', // KVC: Title updated
                version: '1.0.0', // KVC: Version updated
            },
            externalDocs: {
                url: 'https://www.kalivibecoding.com/docs', // KVC: URL updated
                description: 'Find more KVC info here', // KVC: Description updated
            },
        },
    })


    await app.register(rateLimitModule)

    await app.register(fastifySocketIO, {
        cors: {
            origin: '*',
        },
        ...spreadIfDefined('adapter', await getAdapter()),
        transports: ['websocket'],
    })

    app.io.use((socket: Socket, next: (err?: Error) => void) => {
        accessTokenManager
            .verifyPrincipal(socket.handshake.auth.token)
            .then(() => {
                next()
            })
            .catch(() => {
                next(new Error('Authentication error'))
            })
    })

    app.io.on('connection', (socket: Socket) => {
        rejectedPromiseHandler(websocketService.init(socket, app.log), app.log)
    })

    app.addHook('onResponse', async (request, reply) => {
        // eslint-disable-next-line
        reply.header('x-request-id', request.id)
    })
    app.addHook('onRequest', async (request, reply) => {
        const route = app.hasRoute({
            method: request.method as HTTPMethods,
            url: request.url,
        })
        if (!route) {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Route not found',
            })
        }
    })

    app.addHook('preHandler', securityHandlerChain)
    app.addHook('preHandler', rbacMiddleware)
    await systemJobsSchedule(app.log).init()
    await app.register(fileModule)
    await app.register(flagModule)
    await app.register(storeEntryModule)
    await app.register(folderModule)
    await app.register(flowModule)
    await app.register(pieceModule)
    await app.register(flowRunModule)
    await app.register(webhookModule)
    await app.register(appConnectionModule)
    await app.register(openapiModule)
    await app.register(triggerEventModule)
    await app.register(appEventRoutingModule)
    await app.register(authenticationModule)
    await app.register(copilotModule),
    await app.register(platformModule)
    await app.register(humanInputModule)
    await app.register(tagsModule)
    await app.register(mcpModule)
    await pieceSyncService(app.log).setup()
    await app.register(platformUserModule)
    await app.register(issuesModule)
    await app.register(alertsModule)
    await app.register(invitationModule)
    await app.register(workerModule)
    await app.register(aiProviderModule)
    await app.register(licenseKeysModule)
    await app.register(tablesModule)
    await app.register(userModule)
    await app.register(todoModule)
    await app.register(adminPlatformModule)
    await app.register(changelogModule)
    
    app.get(
        '/redirect',
        async (
            request: FastifyRequest<{ Querystring: { code: string } }>,
            reply,
        ) => {
            const params = {
                code: request.query.code,
            }
            if (!params.code) {
                return reply.send('The code is missing in url')
            }
            else {
                return reply
                    .type('text/html')
                    .send(
                        `<script>if(window.opener){window.opener.postMessage({ 'code': '${encodeURIComponent(
                            params.code,
                        )}' },'*')}</script> <html>Redirect succuesfully, this window should close now</html>`,
                    )
            }
        },
    )

    await validateEnvPropsOnStartup(app.log)

    const edition = system.getEdition()
    app.log.info({
        edition,
    }, 'KaliVibeCoding Edition') // KVC: Text updated
    switch (edition) {
        case ApEdition.CLOUD: // KVC: This might be KVCCloudEdition or similar if enum is changed
            await app.register(appCredentialModule)
            await app.register(connectionKeyModule)
            await app.register(platformProjectModule)
            await app.register(platformBillingModule)
            await app.register(projectMemberModule)
            await app.register(appSumoModule)
            await app.register(adminPieceModule)
            await app.register(customDomainModule)
            await app.register(signingKeyModule)
            await app.register(authnSsoSamlModule)
            await app.register(managedAuthnModule)
            await app.register(oauthAppModule)
            await app.register(platformPieceModule)
            await app.register(otpModule)
            await app.register(enterpriseLocalAuthnModule)
            await app.register(federatedAuthModule)
            await app.register(apiKeyModule)
            await app.register(platformFlowTemplateModule)
            await app.register(gitRepoModule)
            await app.register(auditEventModule)
            await app.register(usageTrackerModule)
            await app.register(analyticsModule)
            await app.register(projectRoleModule)
            await app.register(projectReleaseModule)
            await app.register(todoCommentModule)
            await app.register(globalConnectionModule)
            setPlatformOAuthService(platformOAuth2Service(app.log))
            projectHooks.set(projectEnterpriseHooks)
            eventsHooks.set(auditLogService)
            flowRunHooks.set(platformRunHooks)
            flagHooks.set(enterpriseFlagsHooks)
            pieceMetadataServiceHooks.set(enterprisePieceMetadataServiceHooks)
            systemJobHandlers.registerJobHandler(SystemJobName.ISSUES_REMINDER, emailService(app.log).sendReminderJobHandler)
            exceptionHandler.initializeSentry(system.get(AppSystemProp.SENTRY_DSN))
            break
        case ApEdition.ENTERPRISE:
            await app.register(customDomainModule)
            await app.register(platformProjectModule)
            await app.register(projectMemberModule)
            await app.register(signingKeyModule)
            await app.register(authnSsoSamlModule)
            await app.register(managedAuthnModule)
            await app.register(oauthAppModule)
            await app.register(platformPieceModule)
            await app.register(otpModule)
            await app.register(enterpriseLocalAuthnModule)
            await app.register(federatedAuthModule)
            await app.register(apiKeyModule)
            await app.register(platformFlowTemplateModule)
            await app.register(gitRepoModule)
            await app.register(auditEventModule)
            await app.register(usageTrackerModule)
            await app.register(analyticsModule)
            await app.register(projectRoleModule)
            await app.register(projectReleaseModule)
            await app.register(todoCommentModule)
            await app.register(globalConnectionModule)
            systemJobHandlers.registerJobHandler(SystemJobName.ISSUES_REMINDER, emailService(app.log).sendReminderJobHandler)
            setPlatformOAuthService(platformOAuth2Service(app.log))
            projectHooks.set(projectEnterpriseHooks)
            eventsHooks.set(auditLogService)
            flowRunHooks.set(platformRunHooks)
            pieceMetadataServiceHooks.set(enterprisePieceMetadataServiceHooks)
            flagHooks.set(enterpriseFlagsHooks)
            break
        case ApEdition.COMMUNITY:
            await app.register(projectModule)
            await app.register(communityPiecesModule)
            await app.register(communityFlowTemplateModule)
            break
    }

    app.addHook('onClose', async () => {
        app.log.info('Shutting down')
        await flowConsumer(app.log).close()
        await systemJobsSchedule(app.log).close()
        await engineResponseWatcher(app.log).shutdown()
    })

    return app
}



async function getAdapter() {
    const queue = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE)
    switch (queue) {
        case QueueMode.MEMORY: {
            return undefined
        }
        case QueueMode.REDIS: {
            const sub = getRedisConnection().duplicate()
            const pub = getRedisConnection().duplicate()
            return createAdapter(pub, sub)
        }
    }
}


export async function appPostBoot(app: FastifyInstance): Promise<void> {

    app.log.info(`
             _____   _______   _____  __      __  ______   _____    _____   ______    _____   ______    _____
    /\\      / ____| |__   __| |_   _| \\ \\    / / |  ____| |  __ \\  |_   _| |  ____|  / ____| |  ____|  / ____|
   /  \\    | |         | |      | |    \\ \\  / /  | |__    | |__) |   | |   | |__    | |      | |__    | (___
  / /\\ \\   | |         | |      | |     \\ \\/ /   |  __|   |  ___/    | |   |  __|   | |      |  __|    \\___ \\
 / ____ \\  | |____     | |     _| |_     \\  /    | |____  | |       _| |_  | |____  | |____  | |____   ____) |
/_/    \\_\\  \\_____|    |_|    |_____|     \\/     |______| |_|      |_____| |______|  \\_____| |______| |_____/

KaliVibeCoding - Electrify Your Code. Amplify Your Vision.
The application started on ${await domainHelper.getPublicApiUrl({ path: '' })}, as specified by the KVC_FRONTEND_URL variables.`) // KVC: Text and variable updated

    const environment = system.get(AppSystemProp.ENVIRONMENT)
    const piecesSource = system.getOrThrow(AppSystemProp.PIECES_SOURCE) // KVC: Consider KVC_CONNECTORS_SOURCE
    const pieces = process.env.KVC_DEV_CONNECTORS // KVC: Variable name updated

    app.log.warn(
        `[KVC WARNING]: Connectors (Pieces) will be loaded from source type ${piecesSource}`, // KVC: Text updated
    )
    if (environment === ApEnvironment.DEVELOPMENT) { // KVC: ApEnvironment might need to be KVCEnvironment
        app.log.warn(
            `[KVC WARNING]: The application is running in ${environment} mode.`, // KVC: Text updated
        )
        app.log.warn(
            `[KVC WARNING]: This only shows connectors specified in KVC_DEV_CONNECTORS ${pieces} environment variable.`, // KVC: Text and variable updated
        )
    }
    const oldestPlatform = await platformService.getOldestPlatform()
    const key = system.get<string>(AppSystemProp.LICENSE_KEY)
    if (!isNil(oldestPlatform) && !isNil(key)) {
        await platformService.update({
            id: oldestPlatform.id,
            licenseKey: key,
        })
    }
}
