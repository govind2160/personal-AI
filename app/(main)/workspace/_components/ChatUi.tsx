"use client"
import React, { useContext, useEffect, useRef, useState } from 'react'
import EmptyChatState from './EmptyChatState'
import { AssistantContext } from '@/context/AssistantContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2Icon, Send } from 'lucide-react';
import axios from 'axios';
import AiModelOptions from '@/services/AiModelOptions';
import Image from 'next/image';
import Markdown from 'react-markdown'
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AuthContext } from '@/context/AuthContext';
import { ASSISTANT } from '../../ai-assistants/page';
type MESSAGE = {
    role: string,
    content: string
}
function ChatUi() {

    const [input, setInput] = useState<string>('');
    const { assistant, setAssistant } = useContext(AssistantContext)
    const [messages, setMessages] = useState<MESSAGE[]>([]);
    const [loading, setLoading] = useState(false);
    const chatRef = useRef<any>(null);
    const { user, setUser } = useContext(AuthContext);
    const UpdateTokens = useMutation(api.users.UpdateTokens)
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        setMessages([]);
    }, [assistant?.id])

    const onSendMessage = async (inputSuggestion?: string) => {

        setLoading(true)
        setMessages(prev => [...prev,
        {
            role: 'user',
            content: inputSuggestion ?? input
        },
        {
            role: 'assitant',
            content: 'Loading...'
        }
        ])

        const userInput = inputSuggestion ?? input;
        inputRef.current?.focus(); // Keep focus on input
        setInput('');
        const AIModel = AiModelOptions.find(item => item.name == assistant.aiModelId);
        const result = await axios.post('/api/eden-ai-model', {
            provider: AIModel?.edenAi,
            userInput: userInput + ":-" + assistant?.userInstruction,
            aiResp: messages[messages?.length - 1]?.content
        });
        setLoading(false);

        setMessages(prev => prev.slice(0, -1));
        setMessages(prev => [...prev, result.data])
        updateUserToken(result.data?.content)

    }

    const updateUserToken = async (resp: string) => {
        const tokenCount = resp.trim() ? resp.trim().split(/\s+/).length : 0
        console.log(tokenCount);
        //Update User Token
        const result = await UpdateTokens({
            credits: user?.credits - tokenCount,
            uid: user?._id
        });

        setUser((prev: ASSISTANT) => ({
            ...prev,
            credits: user?.credits - tokenCount,
        }));
        console.log(result);
    }
    return (
        <div className='mt-20 p-6 relative h-[88vh]'>
            {messages?.length == 0 && <EmptyChatState
                sendMessage={(input: string) => { onSendMessage(input) }} />}

            <div ref={chatRef} className='h-[74vh] overflow-scroll scrollbar-hide'>
                {messages.map((msg, index) => (
                    <div key={index}
                        className={`flex mb-2 ${msg.role == 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className='flex gap-3'>
                            {msg.role == 'assistant' && <Image src={assistant?.image} alt='assistant'
                                width={100}
                                height={100}
                                className='w-[30px] h-[30px] rounded-full object-cover'
                            />}
                            <div className={`p-3 rounded-lg gap-2
                                ${msg.role == 'user' ?
                                    "bg-gray-200 text-black rounded-lg" :
                                    "bg-gray-50 text-black"

                                }
                                `}>
                                {loading && messages?.length - 1 == index && <Loader2Icon className='animate-spin' />}
                                {/* <h2>{msg.content}</h2> */}
                                <Markdown >{msg.content}</Markdown>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            <div className='flex justify-between p-5 gap-5 
            absolute bottom-5 w-[94%]'>
                <Input
                    ref={inputRef}
                    placeholder='Start Typing here...'
                    value={input}
                    disabled={loading || user?.credits <= 0}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyPress={(e) => e.key == 'Enter' && onSendMessage()}
                />
                <Button disabled={loading || user?.credits <= 0} onClick={() => onSendMessage()}>
                    <Send />
                </Button>
            </div>
        </div>
    )
}

export default ChatUi