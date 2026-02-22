const { Type, StringEnum } = require("@mariozechner/pi-ai");
const fetch = require("node-fetch");
const TurndownService = require("turndown");
const {
    addRemindersToDB,
    addAlertToDb,
    editReminderTextsInDB,
    completeRemindersInDB,
    deleteRemindersFromDB,
    deleteAlertsFromDB,
    readReminders,
} = require("./ai");
const { convertLocalTimeToUTC, getNow } = require("../utils/utils");
const { uxQueue } = require("../services/queue");
const { sendAudioToTelegram, sendPhotoToTelegram } = require("./telegram");

function createTools({ user_id, timezoneOffsetInSeconds, chatId }) {
    return [
        {
            name: "add_reminder",
            description:
                "Create a new reminder with alerts. Use when the user wants to be reminded about something. Extract a short, crisp reminder text without filler words like 'remind me'. Pick the best date/time. Add at least one alert. For recurring reminders, provide a crontab string and generate alerts for the next 7 days.",
            parameters: Type.Object({
                text: Type.String({
                    description:
                        "Short, crisp reminder text. E.g. 'Buy milk', 'Call mom', 'Meeting with John'.",
                }),
                when_date: Type.String({
                    description:
                        "Due date in DD/MM/YYYY format in user's local timezone.",
                }),
                when_time: Type.String({
                    description:
                        "Due time in HH:MM:SS 24-hour format. Default 23:59:00 if no time specified.",
                }),
                recurring: Type.Boolean({
                    description: "True if this is a recurring/repeating reminder.",
                }),
                crontab: Type.Optional(
                    Type.String({
                        description:
                            "Crontab string for recurring reminders (minute hour day-of-month month day-of-week). Null if not recurring.",
                    })
                ),
                alerts: Type.Array(Type.String(), {
                    description:
                        "Array of alert timestamps in 'DD/MM/YYYY HH:MM:SS' format (user's local timezone). At least one required.",
                }),
                family_user_id: Type.Optional(
                    Type.Number({
                        description:
                            "User ID of the family member this reminder is for. Omit if user's own.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const duedate = convertLocalTimeToUTC(
                    args.when_date,
                    args.when_time || "23:59:00",
                    timezoneOffsetInSeconds
                );

                const alertDates = (args.alerts || []).map((alert) =>
                    convertLocalTimeToUTC(
                        alert.split(" ")[0],
                        alert.split(" ")[1],
                        timezoneOffsetInSeconds
                    )
                );

                const reminderId = "" + getNow() + "0";
                const targetUserId = args.family_user_id || user_id;

                const remindersAdded = await addRemindersToDB({
                    reminders: [
                        {
                            id: reminderId,
                            user_id: targetUserId,
                            text: args.text,
                            duedate,
                            recurring: !!args.recurring,
                            completed: false,
                            created_at: new Date(getNow()),
                            updated_at: new Date(getNow()),
                            alerts: alertDates,
                            crontab: args.crontab || "",
                        },
                    ],
                    user_id: targetUserId,
                    timezoneOffsetInSeconds,
                });

                if (remindersAdded.length > 0) {
                    uxQueue.add("new-reminders", {
                        reminders: remindersAdded,
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "add_reminder",
                        count: remindersAdded.length,
                        reminders: remindersAdded.map((r) => ({
                            id: r.id,
                            text: r.text,
                            user_id: r.user_id,
                        })),
                    }),
                };
            },
        },
        {
            name: "add_alert",
            description:
                "Add a new alert to an existing reminder. Use when the user wants an additional notification for a reminder already in the conversation history. Do NOT make up reminder IDs.",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the existing reminder from conversation history.",
                }),
                when_datetime: Type.String({
                    description:
                        "Alert timestamp in 'DD/MM/YYYY HH:MM:SS' format (user's local timezone).",
                }),
                target_user_id: Type.Optional(
                    Type.Number({
                        description: "User ID of the reminder owner. Omit for current user.",
                    })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const duedate = convertLocalTimeToUTC(
                    args.when_datetime.split(" ")[0],
                    args.when_datetime.split(" ")[1],
                    timezoneOffsetInSeconds
                );

                const alert = await addAlertToDb({
                    user_id: args.target_user_id || user_id,
                    reminder_id: args.reminder_id,
                    duedateInUTC: duedate,
                });

                if (alert) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({ success: !!alert, action: "add_alert" }),
                };
            },
        },
        {
            name: "edit_reminder",
            description:
                "Edit the text of an existing reminder. Only use for reminders visible in conversation history.",
            parameters: Type.Object({
                reminder_id: Type.String({ description: "ID of the reminder to edit." }),
                new_text: Type.String({ description: "New text for the reminder." }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const edited = await editReminderTextsInDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            text: args.new_text,
                            user_id: args.target_user_id || user_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (edited.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: edited.length > 0,
                        action: "edit_reminder",
                    }),
                };
            },
        },
        {
            name: "complete_reminder",
            description:
                "Mark a reminder as completed. Only use for reminders visible in conversation history.",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the reminder to mark as complete.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const completed = await completeRemindersInDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            user_id: args.target_user_id || user_id,
                            completed: true,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (completed.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: completed.length > 0,
                        action: "complete_reminder",
                    }),
                };
            },
        },
        {
            name: "delete_reminder",
            description:
                "Delete a reminder and all its alerts. Only use for reminders visible in conversation history. Also use when the user wants to change the cron schedule of a recurring reminder (delete old + add new).",
            parameters: Type.Object({
                reminder_id: Type.String({
                    description: "ID of the reminder to delete.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const deleted = await deleteRemindersFromDB({
                    reminders: [
                        {
                            id: args.reminder_id,
                            user_id: args.target_user_id || user_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (deleted.length > 0) {
                    uxQueue.add("deleted-reminders", {
                        reminders: deleted,
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: deleted.length > 0,
                        action: "delete_reminder",
                    }),
                };
            },
        },
        {
            name: "delete_alert",
            description:
                "Delete a specific alert from a reminder. Only use for alerts visible in conversation history. To change alert time: delete old + add new.",
            parameters: Type.Object({
                alert_id: Type.Number({ description: "ID of the alert to delete." }),
                reminder_id: Type.String({
                    description: "ID of the reminder this alert belongs to.",
                }),
                target_user_id: Type.Optional(
                    Type.Number({ description: "User ID of the reminder owner." })
                ),
            }),
            execute: async (_toolCallId, args) => {
                const deleted = await deleteAlertsFromDB({
                    alerts: [
                        {
                            id: args.alert_id,
                            user_id: args.target_user_id || user_id,
                            reminder_id: args.reminder_id,
                        },
                    ],
                    user_id: args.target_user_id || user_id,
                });

                if (deleted.length > 0) {
                    uxQueue.add("updated-reminders", {
                        reminders: [
                            { id: args.reminder_id, user_id: args.target_user_id || user_id },
                        ],
                        user_id,
                    });
                }

                return {
                    output: JSON.stringify({
                        success: deleted.length > 0,
                        action: "delete_alert",
                    }),
                };
            },
        },
        {
            name: "read_reminders",
            description:
                "Query and read the user's reminders. Use when the user asks about their existing reminders, todos, or schedule.",
            parameters: Type.Object({
                from_date: Type.String({
                    description: "Start date in DD-MM-YYYY format (user's local timezone). Default today.",
                }),
                to_date: Type.String({
                    description:
                        "End date in DD-MM-YYYY format (user's local timezone). Default 7 days from now.",
                }),
                from_time: Type.String({
                    description: "Start time HH:MM:SS 24h. Default 00:00:00.",
                }),
                to_time: Type.String({
                    description: "End time HH:MM:SS 24h. Default 23:59:59.",
                }),
                status: StringEnum(["all", "completed", "incomplete"], {
                    description: "Filter by status. Default 'incomplete'.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                const { reminders } = await readReminders({
                    fromDate: args.from_date,
                    fromTime: args.from_time || "00:00:00",
                    toDate: args.to_date,
                    toTime: args.to_time || "23:59:59",
                    timezoneOffsetInSeconds,
                    status: args.status || "incomplete",
                    user_id,
                });

                return {
                    output: JSON.stringify({
                        success: true,
                        action: "read_reminders",
                        count: reminders.length,
                        reminders: reminders.map((r) => ({
                            id: r.id,
                            text: r.text,
                            duedate: r.duedate,
                            completed: r.completed,
                            recurring: r.recurring,
                            alerts: (r.alerts || []).map((a) => ({
                                id: a.id,
                                duedate: a.duedate,
                            })),
                        })),
                    }),
                };
            },
        },
        ...(process.env.EXA_API_KEY
            ? [
                  {
                      name: "web_search",
                      description:
                          "Search the web for current information. Use when the user asks a question that requires up-to-date knowledge, facts, news, or anything beyond your training data.",
                      parameters: Type.Object({
                          query: Type.String({
                              description:
                                  "The search query. Be specific and descriptive for better results.",
                          }),
                      }),
                      execute: async (_toolCallId, args) => {
                          try {
                              const resp = await fetch("https://api.exa.ai/search", {
                                  method: "POST",
                                  headers: {
                                      "x-api-key": process.env.EXA_API_KEY,
                                      "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                      query: args.query,
                                      type: "auto",
                                      numResults: 5,
                                      contents: {
                                          text: { maxCharacters: 1000 },
                                      },
                                  }),
                              });

                              const data = await resp.json();

                              if (!resp.ok) {
                                  console.log("[WebSearch] Exa error:", JSON.stringify(data));
                                  return {
                                      output: JSON.stringify({
                                          success: false,
                                          error: data.error || "Search failed",
                                      }),
                                  };
                              }

                              const results = (data.results || []).map((r) => ({
                                  title: r.title,
                                  url: r.url,
                                  text: r.text || "",
                              }));

                              console.log(`[WebSearch] Found ${results.length} results for: "${args.query}"`);

                              return {
                                  output: JSON.stringify({
                                      success: true,
                                      action: "web_search",
                                      results,
                                  }),
                              };
                          } catch (err) {
                              console.log("[WebSearch] Error:", err.message);
                              return {
                                  output: JSON.stringify({
                                      success: false,
                                      error: err.message,
                                  }),
                              };
                          }
                      },
                  },
              ]
            : []),
        {
            name: "web_fetch",
            description:
                "Fetch a webpage by URL and return its content as markdown. Use when the user shares a URL and wants to know what's on the page, or when you need to read a specific webpage (e.g. from a search result).",
            parameters: Type.Object({
                url: Type.String({
                    description: "The full URL to fetch (must start with http:// or https://).",
                }),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    console.log(`[WebFetch] Fetching: ${args.url}`);

                    const resp = await fetch(args.url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (compatible; A1Bot/1.0)",
                            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        },
                        timeout: 10000,
                        redirect: "follow",
                    });

                    if (!resp.ok) {
                        return {
                            output: JSON.stringify({
                                success: false,
                                error: `HTTP ${resp.status} ${resp.statusText}`,
                            }),
                        };
                    }

                    const contentType = resp.headers.get("content-type") || "";
                    const html = await resp.text();

                    let content;
                    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
                        const turndownService = new TurndownService();
                        turndownService.remove(["script", "style", "nav", "footer", "iframe"]);
                        content = turndownService.turndown(html);
                    } else {
                        content = html;
                    }

                    // Truncate final content to avoid blowing up LLM context
                    const maxChars = 12000;
                    if (content.length > maxChars) {
                        content = content.slice(0, maxChars) + "\n\n[...truncated]";
                    }

                    console.log(`[WebFetch] Got ${content.length} chars from ${args.url}`);

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "web_fetch",
                            url: args.url,
                            content,
                        }),
                    };
                } catch (err) {
                    console.log("[WebFetch] Error:", err.message);
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
        ...(process.env.ELEVENLABS_API_KEY && chatId
            ? [
                  {
                      name: "text_to_speech",
                      description:
                          "Convert text to speech and send it as an audio message to the user. Use when the user asks you to speak, say something out loud, send a voice message, read something aloud, or wants to hear audio. Keep the text natural and conversational.",
                      parameters: Type.Object({
                          text: Type.String({
                              description:
                                  "The text to convert to speech. Keep it natural and conversational. Max ~5000 characters.",
                          }),
                          voice: Type.Optional(
                              StringEnum(
                                  ["rachel", "drew", "paul", "sarah", "charlie", "george", "emily", "alice", "matilda", "james"],
                                  {
                                      description:
                                          "Voice to use. Options: rachel (warm female), drew (confident male), paul (ground male), sarah (soft female), charlie (casual male), george (british male), emily (calm female), alice (confident female), matilda (warm female), james (deep male). Default: sarah.",
                                  }
                              )
                          ),
                      }),
                      execute: async (_toolCallId, args) => {
                          const VOICE_IDS = {
                              rachel: "21m00Tcm4TlvDq8ikWAM",
                              drew: "29vD33N1CtxCmqQRPOHJ",
                              paul: "5Q0t7uMcjvnagumLfvZi",
                              sarah: "EXAVITQu4vr4xnSDxMaL",
                              charlie: "IKne3meq5aSn9XLyUdCD",
                              george: "JBFqnCBsd6RMkjVDRZzb",
                              emily: "LcfcDJNUP1GQjkzn1xUU",
                              alice: "Xb7hH8MSUJpSbSDYk0k2",
                              matilda: "XrExE9yKIg1WjnnlVkGX",
                              james: "ZQe5CZNOzWyzPSCn5a3c",
                          };

                          const voiceName = args.voice || "sarah";
                          const voiceId = VOICE_IDS[voiceName] || VOICE_IDS.sarah;

                          try {
                              console.log(`[TTS] Generating speech: voice=${voiceName}, text="${args.text.slice(0, 100)}..."`);

                              const resp = await fetch(
                                  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                                  {
                                      method: "POST",
                                      headers: {
                                          "Content-Type": "application/json",
                                          "xi-api-key": process.env.ELEVENLABS_API_KEY,
                                      },
                                      body: JSON.stringify({
                                          text: args.text,
                                          model_id: "eleven_multilingual_v2",
                                      }),
                                  }
                              );

                              if (!resp.ok) {
                                  const errBody = await resp.text();
                                  console.log(`[TTS] ElevenLabs error ${resp.status}:`, errBody);
                                  return {
                                      output: JSON.stringify({
                                          success: false,
                                          error: `ElevenLabs API error: ${resp.status}`,
                                      }),
                                  };
                              }

                              const audioBuffer = await resp.buffer();
                              console.log(`[TTS] Got ${audioBuffer.length} bytes of audio`);

                              await sendAudioToTelegram({
                                  chatId,
                                  audioBuffer,
                                  filename: "speech.mp3",
                              });

                              console.log(`[TTS] Audio sent to chat ${chatId}`);

                              return {
                                  output: JSON.stringify({
                                      success: true,
                                      action: "text_to_speech",
                                      voice: voiceName,
                                      textLength: args.text.length,
                                      audioSize: audioBuffer.length,
                                  }),
                              };
                          } catch (err) {
                              console.log("[TTS] Error:", err.message);
                              return {
                                  output: JSON.stringify({
                                      success: false,
                                      error: err.message,
                                  }),
                              };
                          }
                      },
                  },
              ]
            : []),
        ...((process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) && chatId
            ? [
                  {
                      name: "generate_image",
                      description:
                          "Generate an image from a text description and send it to the user. Use when the user asks you to create, draw, generate, or make an image, picture, illustration, or artwork.",
                      parameters: Type.Object({
                          prompt: Type.String({
                              description:
                                  "Detailed description of the image to generate. Be specific about subjects, style, colors, composition, and mood for best results.",
                          }),
                          aspect_ratio: Type.Optional(
                              StringEnum(
                                  ["1:1", "16:9", "9:16", "4:3", "3:4"],
                                  {
                                      description:
                                          "Aspect ratio. Default: 1:1 (square). Use 16:9 for landscape, 9:16 for portrait/phone wallpaper, 4:3 for photo, 3:4 for portrait photo.",
                                  }
                              )
                          ),
                      }),
                      execute: async (_toolCallId, args) => {
                          const aspectRatio = args.aspect_ratio || "1:1";
                          console.log(`[ImageGen] Generating: "${args.prompt.slice(0, 100)}..." (${aspectRatio})`);

                          // Try Gemini first
                          if (process.env.GEMINI_API_KEY) {
                              try {
                                  console.log(`[ImageGen] Trying Gemini...`);
                                  const resp = await fetch(
                                      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
                                      {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                              contents: [{ parts: [{ text: args.prompt }] }],
                                              generationConfig: {
                                                  responseModalities: ["IMAGE"],
                                                  imageConfig: { aspectRatio },
                                              },
                                          }),
                                      }
                                  );

                                  const data = await resp.json();

                                  if (resp.ok && data.candidates?.[0]?.content?.parts) {
                                      const imagePart = data.candidates[0].content.parts.find(
                                          (p) => p.inlineData
                                      );
                                      if (imagePart) {
                                          const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
                                          console.log(`[ImageGen] Gemini success: ${imageBuffer.length} bytes`);

                                          await sendPhotoToTelegram({
                                              chatId,
                                              photoBuffer: imageBuffer,
                                              filename: "generated.png",
                                          });

                                          return {
                                              output: JSON.stringify({
                                                  success: true,
                                                  action: "generate_image",
                                                  provider: "gemini",
                                                  prompt: args.prompt,
                                              }),
                                          };
                                      }
                                  }

                                  console.log(`[ImageGen] Gemini failed:`, JSON.stringify(data).slice(0, 300));
                              } catch (err) {
                                  console.log(`[ImageGen] Gemini error:`, err.message);
                              }
                          }

                          // Fallback to OpenAI DALL-E 3
                          if (process.env.OPENAI_API_KEY) {
                              try {
                                  console.log(`[ImageGen] Trying OpenAI DALL-E 3...`);
                                  const sizeMap = {
                                      "1:1": "1024x1024",
                                      "16:9": "1792x1024",
                                      "9:16": "1024x1792",
                                      "4:3": "1792x1024",
                                      "3:4": "1024x1792",
                                  };

                                  const resp = await fetch("https://api.openai.com/v1/images/generations", {
                                      method: "POST",
                                      headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                                      },
                                      body: JSON.stringify({
                                          model: "dall-e-3",
                                          prompt: args.prompt,
                                          size: sizeMap[aspectRatio] || "1024x1024",
                                          response_format: "b64_json",
                                          n: 1,
                                      }),
                                  });

                                  const data = await resp.json();

                                  if (resp.ok && data.data?.[0]?.b64_json) {
                                      const imageBuffer = Buffer.from(data.data[0].b64_json, "base64");
                                      console.log(`[ImageGen] OpenAI success: ${imageBuffer.length} bytes`);

                                      await sendPhotoToTelegram({
                                          chatId,
                                          photoBuffer: imageBuffer,
                                          filename: "generated.png",
                                      });

                                      return {
                                          output: JSON.stringify({
                                              success: true,
                                              action: "generate_image",
                                              provider: "openai",
                                              prompt: args.prompt,
                                          }),
                                      };
                                  }

                                  console.log(`[ImageGen] OpenAI failed:`, JSON.stringify(data).slice(0, 300));
                              } catch (err) {
                                  console.log(`[ImageGen] OpenAI error:`, err.message);
                              }
                          }

                          return {
                              output: JSON.stringify({
                                  success: false,
                                  error: "Image generation failed with all available providers.",
                              }),
                          };
                      },
                  },
              ]
            : []),
    ];
}

module.exports = { createTools };
