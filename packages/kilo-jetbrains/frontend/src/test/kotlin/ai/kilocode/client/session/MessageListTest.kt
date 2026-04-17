package ai.kilocode.client.session

import ai.kilocode.client.session.model.SessionModelEvent
import ai.kilocode.rpc.dto.ChatEventDto

class MessageListTest : SessionControllerTestBase() {

    fun `test MessageUpdated adds message to ChatModel`() {
        val (m, _, model) = prompted()

        emit(ChatEventDto.MessageUpdated("ses_test", msg("msg1", "ses_test", "assistant")))

        assertTrue(model.any { it is SessionModelEvent.MessageAdded })
        assertNotNull(m.model.message("msg1"))
    }

    fun `test PartUpdated text updates ChatModel`() {
        val (m, _, model) = prompted()

        emit(ChatEventDto.MessageUpdated("ses_test", msg("msg1", "ses_test", "assistant")))

        emit(ChatEventDto.PartUpdated("ses_test", part("prt1", "ses_test", "msg1", "text", text = "hello")))

        assertTrue(model.any { it is SessionModelEvent.ContentAdded && it.messageId == "msg1" })
        assertModel(
            """
            assistant#msg1
            text#prt1:
              hello
            """,
            m,
        )
    }

    fun `test PartDelta appends text to ChatModel`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.MessageUpdated("ses_test", msg("msg1", "ses_test", "assistant")))

        emit(ChatEventDto.PartDelta("ses_test", "msg1", "prt1", "text", "hello "), flush = false)
        emit(ChatEventDto.PartDelta("ses_test", "msg1", "prt1", "text", "world"))

        assertModel(
            """
            assistant#msg1
            text#prt1:
              hello world
            """,
            m,
        )
    }

    fun `test MessageRemoved removes from ChatModel`() {
        val (m, _, _) = prompted()

        emit(ChatEventDto.MessageUpdated("ses_test", msg("msg1", "ses_test", "user")))
        assertNotNull(m.model.message("msg1"))

        emit(ChatEventDto.MessageRemoved("ses_test", "msg1"))
        assertNull(m.model.message("msg1"))
    }
}
