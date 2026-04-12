plugins {
    `kotlin-dsl`
}

repositories {
    mavenCentral()
}

gradlePlugin {
    plugins {
        create("build-tasks") {
            id = "ai.kilocode.jetbrains.build-tasks"
            implementationClass = "BuildTasksPlugin"
        }
    }
}
