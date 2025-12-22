#!/usr/bin/env python3
"""
Test script to understand Memori functionality and usage patterns
for integration with WhatsApp AI agent
"""

import os
import asyncio
from memori import Memori, Recall

# For testing purposes, we'll use environment variables for API keys
# These should be set based on your LLM provider
os.environ.setdefault("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", "fake-key-for-test"))

async def test_basic_functionality():
    print("Testing basic Memori functionality...")

    # Create a Memori instance with SQLite backend
    # We'll use a local SQLite file for simplicity
    memori = Memori(
        connection_string="sqlite:///./whatsapp_memories.db"
    )

    # Use the Recall class for memory operations
    # Memori uses a different API than initially assumed
    recall = Recall(memori=memori)

    # Example of storing a memory from a WhatsApp message
    # In Memori, we need to work with the memory system differently
    result = recall.remember(
        entity_id="whatsapp_user_123",
        process_id="whatsapp_conversation_456",
        content="Hello from WhatsApp user!",
        metadata={"source": "whatsapp", "message_type": "text"}
    )

    print(f"Memory operation result: {result}")

    # Example of retrieving memories
    memories = recall.search(
        entity_id="whatsapp_user_123",
        process_id="whatsapp_conversation_456",
        query="Hello"
    )

    print(f"Found {len(memories)} memories matching query")
    for mem in memories:
        print(f"  - Content: {mem}")

    return memori

async def test_with_llm():
    print("\nTesting Memori with LLM integration...")

    # Create Memori instance
    memori = Memori(connection_string="sqlite:///./whatsapp_memories.db")

    # Use Recall to store and retrieve memories
    recall = Recall(memori=memori)

    # This is where you would integrate with your WhatsApp message handling
    # For example, when a message comes in from WhatsApp:
    user_message = "Hello! What can you help me with today?"

    # Store the incoming message as a memory
    recall.remember(
        entity_id="whatsapp_user_123",
        process_id="whatsapp_conversation_456",
        content=user_message,
        metadata={"source": "whatsapp", "direction": "incoming"}
    )

    print(f"Stored incoming message: {user_message}")

    # Query for related memories to provide context for the AI response
    context_memories = recall.search(
        entity_id="whatsapp_user_123",
        process_id="whatsapp_conversation_456",
        query="Hello",
        limit=5
    )

    print(f"Found {len(context_memories)} contextual memories")

    # Here you would use the context memories to inform the LLM response
    # For example, you might create a prompt that includes the context:
    context_text = "\n".join([str(mem) for mem in context_memories])

    # In a real implementation, you would call an LLM provider with context
    # For this test, we'll just simulate a response
    simulated_response = "Hello! I'm your AI assistant. How can I help you today?"

    # Store the AI's response as another memory
    recall.remember(
        entity_id="whatsapp_user_123",
        process_id="whatsapp_conversation_456",
        content=simulated_response,
        metadata={"source": "ai", "direction": "outgoing"}
    )

    print(f"Simulated AI response: {simulated_response}")

    return memori

async def main():
    print("Starting Memori tests for WhatsApp integration...")

    try:
        # Test basic functionality
        memori = await test_basic_functionality()

        # Test LLM integration
        await test_with_llm()

        print("\nMemori tests completed successfully!")
        print("The memory database has been created at: whatsapp_memories.db")

    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())