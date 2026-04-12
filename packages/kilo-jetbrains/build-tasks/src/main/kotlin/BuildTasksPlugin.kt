import org.gradle.api.Plugin
import org.gradle.api.Project

/**
 * Empty marker plugin that exposes task classes from this build-logic
 * module to the main build. Apply it in any subproject that needs
 * [FixGeneratedApiTask], [PrepareLocalCliTask], or [CheckCliTask].
 */
class BuildTasksPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        // Task classes are available on the classpath once this plugin is applied.
    }
}
