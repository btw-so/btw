import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useUpdateEffect } from "react-use";
import { useParams } from "react-router-dom";
import { selectList } from "../selectors";
import useTreeChanges from "tree-changes-hook";

import { useAppSelector } from "modules/hooks";

import { STATUS } from "../literals";

import { getPublicNote } from "../actions";

function PublicNoteContainer() {
  const dispatch = useDispatch();
  const list = useAppSelector(selectList);

  const { id, hash } = useParams();

  useEffect(() => {
    dispatch(getPublicNote({ id, hash }));
  }, [id, hash]);

  return (
    <div key="PublicNote" data-testid="PublicNote" className="min-h-full flex flex-col shrink-0 grow">
        <div
          className="w-full h-0.5 border-b border-gray-100 h-6 md:h-12 flex"
        >
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-5xl w-full"></div>
        </div>
        <div 
          className="container mx-6 w-auto md:w-full md:mx-auto px-6 md:px-12 pt-6 md:pt-12 border-solid border-gray-100 border-x max-w-5xl tiptap-editor flex-grow flex-shrink-0"
        >
          <div className="text-3xl font-bold mb-3 leading-tight tracking-tight">
            {list.publicNote?.data?.heading}
          </div>
          <div className="text-sm w-full text-gray-500">
            <div
              className="prose md:prose-lg w-full min-w-full pb-12"
              dangerouslySetInnerHTML={{
                __html: list.publicNote?.data?.html,
              }}
            />
          </div>
        </div>
        <div
          className="w-full h-0.5 border-t border-gray-100 h-6 md:h-12 flex"
        >
          <div className="container mx-6 md:mx-auto px-6 md:px-12 pt-0 md:pt-12 border-solid border-gray-100 border-x max-w-5xl w-full"></div>
        </div>
    </div>
  );
}

export default PublicNoteContainer;
