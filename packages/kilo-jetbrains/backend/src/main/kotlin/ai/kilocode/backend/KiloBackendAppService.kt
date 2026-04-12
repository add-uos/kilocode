package ai.kilocode.backend

import ai.kilocode.jetbrains.api.client.DefaultApi
import ai.kilocode.jetbrains.api.model.Config
import ai.kilocode.jetbrains.api.model.KiloNotifications200ResponseInner
import ai.kilocode.jetbrains.api.model.KiloProfile200Response
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * App-level orchestrator that owns the CLI server lifecycle and
 * loads project-independent data after the connection is established.
 *
 * This is the single entry point for the CLI backend. Both
 * [KiloBackendProjectService] and [KiloApiService][ai.kilocode.KiloApiService]
 * (frontend) reach the CLI through this service.
 *
 * Data flows use the generated OpenAPI model types directly —
 * no intermediate DTOs needed at the backend layer.
 */
@Service(Service.Level.APP)
class KiloBackendAppService(private val cs: CoroutineScope) : Disposable {

    companion object {
        private val LOG = Logger.getInstance(KiloBackendAppService::class.java)
    }

    private val server = KiloBackendCliManager(cs)
    private val connection = KiloConnectionService(cs, server)

    private var router: Job? = null
    private var loader: Job? = null

    // ── Delegated state ─────────────────────────────────────────────

    val state: StateFlow<ConnectionState> get() = connection.state
    val events: SharedFlow<SseEvent> get() = connection.events
    val api: DefaultApi? get() = connection.api

    // ── Global data (project-independent) ───────────────────────────

    @Volatile var profile: KiloProfile200Response? = null
        private set

    @Volatile var config: Config? = null
        private set

    @Volatile var notifications: List<KiloNotifications200ResponseInner> = emptyList()
        private set

    // ── Lifecycle ────────────────────────────────────────────────────

    suspend fun connect() {
        connection.connect()
    }

    suspend fun restart() {
        clear()
        connection.restart()
    }

    suspend fun reinstall() {
        clear()
        connection.reinstall()
    }

    // ── Internals ───────────────────────────────────────────────────

    init {
        // Watch connection state — load global data on each (re)connect.
        cs.launch {
            connection.state.collect { next ->
                if (next is ConnectionState.Connected) {
                    load()
                    ensureRouter()
                }
            }
        }
    }

    /**
     * Launch all project-independent data fetches in parallel.
     * Each fetch is independent — a failure in one does not block the others.
     */
    private fun load() {
        loader?.cancel()
        loader = cs.launch {
            LOG.info("Loading global data")
            coroutineScope {
                launch { loadProfile() }
                launch { loadConfig() }
                launch { loadNotifications() }
            }
            LOG.info("Global data loaded")
        }
    }

    private suspend fun loadProfile() {
        val client = connection.api ?: return
        try {
            val response = client.kiloProfile()
            profile = response
            LOG.info("Profile: ${response.profile.email}")
        } catch (e: Exception) {
            // 401 = not logged in to Kilo Gateway — expected, not an error
            LOG.info("Profile fetch skipped: ${e.message}")
        }
    }

    private suspend fun loadConfig() {
        val client = connection.api ?: return
        try {
            val response = client.globalConfigGet()
            config = response
            LOG.info("Global config loaded")
        } catch (e: Exception) {
            LOG.warn("Global config fetch failed", e)
        }
    }

    private suspend fun loadNotifications() {
        val client = connection.api ?: return
        try {
            val response = client.kiloNotifications()
            notifications = response
            LOG.info("Notifications: ${response.size} items")
        } catch (e: Exception) {
            LOG.warn("Notifications fetch failed", e)
        }
    }

    /**
     * Route SSE events that require global data reloads.
     * Only one router runs at a time — restarted on reconnect.
     */
    private fun ensureRouter() {
        if (router?.isActive == true) return
        router = cs.launch {
            connection.events.collect { event ->
                when (event.type) {
                    "global.config.updated" -> launch { loadConfig() }
                }
            }
        }
    }

    private fun clear() {
        loader?.cancel()
        router?.cancel()
        profile = null
        config = null
        notifications = emptyList()
    }

    override fun dispose() {
        clear()
        connection.dispose()
        server.dispose()
    }
}
