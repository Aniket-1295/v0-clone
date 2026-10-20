
export function lastAssistantTextMessageContent(result){
    const lastAssistantTextMessageIndex = result.output.findLastIndex(
        (message) => message.role === "assistant"
    )

    const message = result.output[lastAssistantTextMessageIndex] 


    return message?.content ? typeof message.content === "string" ? message.content : message.content.map((c)=>c.text).join("") : undefined
}

// Follow-up context: a list of the app's files plus the contents of the app's own source
// files (not the stock shadcn/ui components), capped so tool calls stay small.
const OWN_SOURCE_PATTERN = /^(app|components|lib|hooks)\/.*\.(tsx?|jsx?)$/;
const SHADCN_UI_PREFIX = "components/ui/";
const MAX_CONTEXT_CHARS = 20_000;

/**
 * Describes the code already in the sandbox (a snapshotFiles() result) so a follow-up
 * prompt edits the existing app instead of starting over. Sent as a user message.
 */
export function buildFollowUpContext(files){
    const paths = Object.keys(files).sort()
    const uiCount = paths.filter((p) => p.startsWith(SHADCN_UI_PREFIX)).length
    const ownPaths = paths.filter((p) => !p.startsWith(SHADCN_UI_PREFIX))

    // app/page.tsx first: it is the file nearly every follow-up touches.
    const sources = ownPaths
        .filter((p) => OWN_SOURCE_PATTERN.test(p))
        .sort((a, b) => (a === "app/page.tsx" ? -1 : b === "app/page.tsx" ? 1 : 0))

    const shown = []
    let budget = MAX_CONTEXT_CHARS
    for(const path of sources){
        const content = files[path]
        if(content.length > budget) continue
        budget -= content.length
        shown.push(`--- ${path} ---\n${content}`)
    }

    return [
        "Context for my next request: the app from our earlier messages is already running in the sandbox.",
        "Edit it in place. Keep everything I do not ask to change, and only rewrite the files that need to change.",
        "Read any other file with readFiles before changing it.",
        "",
        `Files (relative to /home/user): ${ownPaths.join(", ")}${uiCount ? `, plus ${uiCount} shadcn/ui components in components/ui/` : ""}.`,
        "",
        "Current source:",
        shown.join("\n\n"),
    ].join("\n")
}
