import React from "react";

const TipTapTeacherSummary = ({ data, onClick, fix }) => {
    const grade = data?.data?.grade;
    const adverbs = data?.data?.adverbs;
    const adverbsGoal = Math.round(data?.data?.paragraphs / 3);
    const adverbsResults = data?.results?.filter((x) => x.type === "adverbs");
    const passiveVoice = data?.data?.passiveVoice;
    const passiveVoiceGoal = Math.round(data?.data?.sentences / 5);
    const passiveResults = data?.results?.filter(
        (x) => x.type === "passiveVoice"
    );
    const complex = data?.data?.complex;
    const complexResults = data?.results?.filter((x) => x.type === "complex");
    const hardToRead = data?.data?.hardSentences;
    const hardToReadResults = data?.results?.filter(
        (x) => x.type === "hardSentences"
    );
    const veryHardToRead = data?.data?.veryHardSentences;
    const veryHardToReadResults = data?.results?.filter(
        (x) => x.type === "veryHardSentences"
    );
    const headingLevelTotal = data?.data?.headingLevelTotal;
    const headingLevelResults = data?.results?.filter(
        (x) => x.type === "HeadingLevel"
    );
    const moreThanOneH1Total = data?.data?.moreThanOneH1Total;
    const moreThanOneH1Results = data?.results?.filter(
        (x) => x.type === "MoreThanOneH1"
    );
    const firstElementNotH1 = data?.data?.firstElementNotH1;
    const firstElementNotH1Results = data?.results?.filter(
        (x) => x.type === "FirstElementNotH1"
    );
    const monotonous = data?.data?.monotonous;
    const monotonousResults = data?.results?.filter(
        (x) => x.type === "MonotonousTone"
    );

    const getSummary = ({ className, count, title, goal, key }) => {
        return (
            <div
                className={`problem ${className} px-4 py-2 rounded mt-4`}
                key={`summary-${key || className}`}
            >
                <p className="font-bold">
                    <span className="bg-slate-700 text-white px-0.5">
                        {count || 0}
                    </span>{" "}
                    {title}
                </p>
                <p className="text-xs">{goal}</p>
            </div>
        );
    };

    const getTodos = (results, className, extract) => {
        return results?.map((res, i) => (
            <div
                key={`${i}-${className}-todo`}
                className={`problem ${className} ml-8 px-2 py-1 rounded mt-1 flex cursor-pointer items-center`}
                onClick={() => onClick(res.from, res.to)}
            >
                <p className="font-bold flex-grow text-ellipsis overflow-hidden whitespace-pre">
                    {extract(res.data)}
                </p>
                {res.fix ? (
                    <div
                        className="rounded px-1.5 -py-0.5 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0,0,0,0.1)",
                            height: "20px",
                        }}
                        onClick={() => {
                            fix(res.fix, res);
                        }}
                        title={res.message}
                    >
                        <span className="text-xs ">Fix</span>
                    </div>
                ) : null}
            </div>
        ));
    };

    const getElementsInOrder = () => {
        const components = [
            {
                components: [
                    getSummary({
                        className: "adverbs",
                        count: adverbs,
                        title: "adverbs",
                        goal:
                            adverbs < adverbsGoal
                                ? `Good. Below the goal of ${adverbsGoal}.`
                                : `Too many. Keep it below ${adverbsGoal}.`,
                    }),
                    getTodos(adverbsResults, "adverbs", (data) => data.adverb),
                ],
                order: adverbsResults?.[0]?.from,
            },
            {
                components: [
                    getSummary({
                        className: "passiveVoice",
                        count: passiveVoice,
                        title: "passive voice",
                        goal:
                            passiveVoice < passiveVoiceGoal
                                ? `Good. Below the goal of ${passiveVoiceGoal}.`
                                : `Too many. Keep it below ${passiveVoiceGoal}.`,
                    }),
                    getTodos(
                        passiveResults,
                        "passiveVoice",
                        (data) => data.passive
                    ),
                ],
                order: passiveResults?.[0]?.from,
            },
            {
                components: [
                    getSummary({
                        className: "complex",
                        count: complex,
                        title: `complex sentence${complex === 1 ? "" : "s"}`,
                        goal: complex == 0 ? `Good.` : `Can be simplified.`,
                    }),
                    getTodos(
                        complexResults,
                        "complex",
                        (data) => data.complexWord
                    ),
                ],
                order: complexResults?.[0]?.from,
            },
            {
                components: [
                    getSummary({
                        className: "MonotonousTone",
                        count: monotonous,
                        title: `monotonous sentence${
                            monotonous === 1 ? "" : "s"
                        }`,
                        goal: complex == 0 ? `Good.` : `Try varying the tone.`,
                    }),
                    getTodos(
                        monotonousResults,
                        "MonotonousTone",
                        (data) => data.sentence
                    ),
                ],
                order: monotonousResults?.[0]?.from,
            },
            {
                components: [
                    getSummary({
                        className: "hardSentences",
                        count: hardToRead,
                        title: `hard to read sentence${
                            monotonous === 1 ? "" : "s"
                        }`,
                        goal:
                            hardToRead == 0 ? `Good.` : `Try varying the tone.`,
                    }),
                    getTodos(
                        hardToReadResults,
                        "hardSentences",
                        (data) => data.sentence
                    ),
                ],
                order: hardToReadResults?.[0]?.from,
            },
            {
                components: [
                    moreThanOneH1Total
                        ? getSummary({
                              className: "MoreThanOneH1",
                              count: moreThanOneH1Total + 1,
                              title: `H1 sentences`,
                              goal: "Only 1 H1 is recommendeda for SEO.",
                          })
                        : null,
                    getTodos(
                        moreThanOneH1Results?.filter((x) => x.data.sentence),
                        "MoreThanOneH1",
                        (data) => data.sentence
                    ),
                ],
                order: moreThanOneH1Results?.[0]?.from,
            },
            {
                components: [
                    headingLevelTotal
                        ? getSummary({
                              className: "MoreThanOneH1",
                              count: headingLevelTotal,
                              title: `heading ${
                                  headingLevelTotal > 1
                                      ? "inconsistencies"
                                      : "inconsistency"
                              }`,
                              goal: "Heading levels are recommended to drop consistently.",
                              key: "headingLevelTotal",
                          })
                        : null,
                    getTodos(
                        headingLevelResults?.filter((x) => x.data.sentence),
                        "MoreThanOneH1",
                        (data) => data.sentence
                    ),
                ],
                order: headingLevelResults?.[0]?.from,
            },
            {
                components: [
                    firstElementNotH1
                        ? getSummary({
                              className: "MoreThanOneH1",
                              count: 1,
                              title: `H1 inconsistency`,
                              goal: "Note should start with H1",
                              key: "firstElementNotH1",
                          })
                        : null,
                ],
                order: 0,
            },
            {
                components: [
                    getSummary({
                        className: "veryHardSentences",
                        count: veryHardToRead,
                        title: `sentence${
                            veryHardToRead === 1 ? "" : "s"
                        } very hard to read`,
                        goal:
                            veryHardToRead == 0
                                ? `Good.`
                                : `Can be simplified.`,
                    }),
                    getTodos(
                        veryHardToReadResults?.filter((x) => x.data.sentence),
                        "veryHardSentences",
                        (data) => data.sentence
                    ),
                ],
                order: veryHardToReadResults?.[0]?.from,
            },
        ];

        var componentsToRender = [];
        // sort and flatten the components
        [...components]
            .sort((a, b) => a.order - b.order)
            .forEach((x) => {
                if (x.components[0]) {
                    componentsToRender.push(x.components[0]);
                }
                if (x.components[1]) {
                    componentsToRender.push(x.components[1]);
                }
            });

        return componentsToRender;
    };

    return (
        <div className=" tipTapTeacherSummary px-21 overflow-y-auto max-h-full">
            <div className="px-4 pb-4 pt-0">
                <h2 className="font-bold text-xl">Readability</h2>
                <p
                    className={`${
                        grade <= 9
                            ? "text-green-600"
                            : grade <= 13
                            ? "text-yellow-500"
                            : "text-red-500"
                    } text-lg font-bold`}
                >
                    Grade {grade}
                </p>
                <p>
                    {grade <= 9 ? "Good." : grade <= 13 ? "Ok." : "Poor."}{" "}
                    {grade > 9 ? "Aim for 9." : ""}
                </p>

                {getElementsInOrder()}
            </div>
        </div>
    );
};

export default TipTapTeacherSummary;