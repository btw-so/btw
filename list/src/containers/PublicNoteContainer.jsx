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
    <div key="PublicNote" data-testid="PublicNote">
      <>
        <header className="container mx-auto py-6 px-4">
          <div className="flex items-center">
            <img src="/media/images/btw-logo.png" alt="Logo" className="h-4" />
          </div>
        </header>
        <div className="container mx-auto my-12 max-w-2xl tiptap-editor">
          <div className="text-xl font-bold">
            {list.publicNote?.data?.heading}
          </div>
          <div className="text-sm text-gray-500">
            <div
              className="prose"
              dangerouslySetInnerHTML={{
                __html: list.publicNote?.data?.html,
              }}
            />
          </div>
        </div>
      </>
    </div>
  );
}

export default PublicNoteContainer;
