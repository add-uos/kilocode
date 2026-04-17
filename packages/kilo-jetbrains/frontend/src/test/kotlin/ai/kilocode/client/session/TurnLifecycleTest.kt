package ai.kilocode.client.session

import ai.kilocode.rpc.dto.ChatEventDto
import ai.kilocode.rpc.dto.MessageErrorDto

class TurnLifecycleTest : SessionControllerTestBase() {

    fun `test TurnOpen fires StateChanged to Busy`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.TurnOpen("ses_test"))

        assertSession(
            """
            [code] [kilo/gpt-5] [busy] [considering next steps]
            """,
            m,
        )
    }

    fun `test TurnClose fires StateChanged to Idle`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.TurnOpen("ses_test"))
        emit(ChatEventDto.TurnClose("ses_test", "completed"))

        assertSession(
            """
            [code] [kilo/gpt-5] [idle]
            """,
            m,
        )
    }

    fun `test Error fires StateChanged to Error`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.Error("ses_test", MessageErrorDto(type = "APIError", message = "Bad Request")))

        assertSession(
            """
            [code] [kilo/gpt-5] [error] [Bad Request]
            """,
            m,
        )
    }

    fun `test Error with null message falls back to type`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.Error("ses_test", MessageErrorDto(type = "timeout", message = null)))

        assertSession(
            """
            [code] [kilo/gpt-5] [error] [timeout]
            """,
            m,
        )
    }
}
