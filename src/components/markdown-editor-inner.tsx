"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

export default function MarkdownEditorInner({
  markdown,
  onChange,
  placeholder,
}: {
  markdown: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div id="description">
      <MDXEditor
        markdown={markdown}
        onChange={onChange}
        placeholder={placeholder}
        className="mosg-mdx"
        contentEditableClassName="mosg-mdx-content"
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [2, 3] }),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          markdownShortcutPlugin(),
          diffSourcePlugin({ viewMode: "rich-text" }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelect />
                <ListsToggle options={["bullet", "number"]} />
                <CreateLink />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
    </div>
  );
}
