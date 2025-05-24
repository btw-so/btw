import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import React from 'react'

export default ({ node: { attrs: { language: defaultLanguage } }, updateAttributes, extension }) => (
  <NodeViewWrapper className="code-block tiptap-code-block bg-gray-100 rounded-md relative">
    <select className='text-end pr-8 pb-0.5 opacity-50 transition-opacity duration-200 hover:opacity-100 pt-0 pl-2 text-gray-500 z-10 absolute top-2 right-2 rounded-md bg-transparent cursor-pointer text-sm border-0 border-none focus:outline-none focus:ring-0 focus:border-0' contentEditable={false} defaultValue={defaultLanguage} onChange={event => updateAttributes({ language: event.target.value })}>
      <option value="null">
        auto
      </option>
      <option disabled>
        —
      </option>
      {extension.options.lowlight.listLanguages().map((lang, index) => (
        <option key={index} value={lang}>
          {lang}
        </option>
      ))}
    </select>
    <pre className='!mt-0 !pr-32 !bg-gray-100'>
      <NodeViewContent as="code" />
    </pre>
  </NodeViewWrapper>
)