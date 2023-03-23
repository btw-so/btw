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
        maxNumberOfFiles: 100,
        allowedFileTypes: this.props.allowedFileTypes || [".html"],
        allowMultipleUploads: true,
      },
      id: "uppy",
      meta: {},
    });

    this.uppy.use(AwsS3, {
      id: this.uppyId + "-aws-s3",
      timeout: ms("1 minute"),
      limit: 100,
      companionUrl: process.env.REACT_APP_UPPY_COMPANION_URL,
      acl: "public-read",
    });

    this.uppy.on("complete", (res) => {
      // console.log(res);
      // const url = res.successful[0].uploadURL;
      // console.log(url);
      this.props.onResults &&
        this.props.onResults({
          urls: (res.successful || []).map((x) => x.uploadURL),
        });
    });
  }

  componentWillUnmount() {
    this.uppy.close();
  }

  render() {
    return (
      <Dashboard
        uppy={this.uppy}
        height={200}
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
