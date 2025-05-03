import React, { useEffect } from "react";
import Uppy from "@uppy/core";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import ms from "ms";

class UppyComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    this.uppyId = "uppy";
    this.uppy = new Uppy({
      restrictions: {
        maxNumberOfFiles: this.props.maxNumberOfFiles || 100,
        allowedFileTypes: this.props.allowedFileTypes || [".html"],
        allowMultipleUploads:
          typeof this.props.allowMultipleUploads === "boolean"
            ? this.props.allowMultipleUploads
            : true,
        maxFileSize: this.props.maxFileSize || 10 * 1024 * 1024,
      },
      id: "uppy",
      meta: {
        folder: this.props.folder || "default4",
      },
    });

    this.uppy.use(AwsS3, {
      id: this.uppyId + "-aws-s3",
      timeout: ms("1 minute"),
      limit: 100,
      companionUrl: process.env.REACT_APP_UPPY_COMPANION_URL,
      acl: "public-read",
      allowedMetaFields: ["folder", "name", "relativePath", "fileName", "url"],
    });

    this.uppy.on("files-added", (files) => {
      files.forEach((file) => {
        // Get the last dot index to correctly separate the name and extension
        let lastDotIndex = file.name.lastIndexOf(".");
        let name =
          lastDotIndex !== -1
            ? file.name.substring(0, lastDotIndex)
            : file.name;
        let extension =
          lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : "";

        // Sanitize the name
        name = name.toLowerCase().replace(/[^a-z0-9_-]/g, "");

        // Generate a random nonce
        const nonce = Math.random().toString(36).substring(2, 8);

        // Set file metadata
        this.uppy.setFileMeta(file.id, {
          folder: this.props.folder || "default",
          fileName: `${this.props.folder || "default"}/${name}_${nonce}${
            extension ? `.${extension}` : ""
          }`,
          relativePath: `${this.props.folder || "default"}/${name}_${nonce}${
            extension ? `.${extension}` : ""
          }`,
        });
      });

      // Auto-proceed with upload if enabled
      if (this.props.autoProceed) {
        this.uppy.upload();
      }
    });

    this.uppy.on("complete", (res) => {
      // console.log(res);
      // const url = res.successful[0].uploadURL;
      // console.log(url);
      this.props.onResults &&
        this.props.onResults({
          urls: (res.successful || [])
            .map((x) => x.uploadURL)
            .map((x) =>
              x
                .split(
                  `${process.env.REACT_APP_S3_ENDPOINT}/${process.env.REACT_APP_S3_ENDPOINT}`
                )
                .join(process.env.REACT_APP_S3_ENDPOINT)
            ),
          names: (res.successful || []).map((x) => x.name),
        });

      if (this.props.autoReset) {
        this.uppy.clearUploadedFiles();
      }
    });
  }

  componentWillUnmount() {
    this.uppy.close();
  }

  render() {
    return (
      <Dashboard
        uppy={this.uppy}
        height={this.props.height || 500}
        inline={true}
        showLinkToFileUploadResult={false}
        showProgressDetails={true}
        proudlyDisplayPoweredByUppy={false}
        // closeAfterFinish={true}
        plugins={[]}
      />
    );
  }
}

export default UppyComponent;
