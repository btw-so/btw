import { Extension } from "@tiptap/core";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// create a debouncer to prevent the plugin from running too often
const debounce = (fn, delay) => {
    let timeoutID = null;
    return function (...args) {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            fn(...args);
        }, delay);
    };
};

function getQualifyingWords() {
    return {
        "i believe": 1,
        "i consider": 1,
        "i don't believe": 1,
        "i don't consider": 1,
        "i don't feel": 1,
        "i don't suggest": 1,
        "i don't think": 1,
        "i feel": 1,
        "i hope to": 1,
        "i might": 1,
        "i suggest": 1,
        "i think": 1,
        "i was wondering": 1,
        "i will try": 1,
        "i wonder": 1,
        "in my opinion": 1,
        "is kind of": 1,
        "is sort of": 1,
        just: 1,
        maybe: 1,
        perhaps: 1,
        possibly: 1,
        "we believe": 1,
        "we consider": 1,
        "we don't believe": 1,
        "we don't consider": 1,
        "we don't feel": 1,
        "we don't suggest": 1,
        "we don't think": 1,
        "we feel": 1,
        "we hope to": 1,
        "we might": 1,
        "we suggest": 1,
        "we think": 1,
        "we were wondering": 1,
        "we will try": 1,
        "we wonder": 1,
    };
}

function getLyWords() {
    return {
        actually: 1,
        additionally: 1,
        allegedly: 1,
        ally: 1,
        alternatively: 1,
        anomaly: 1,
        apply: 1,
        approximately: 1,
        ashely: 1,
        ashly: 1,
        assembly: 1,
        awfully: 1,
        baily: 1,
        belly: 1,
        bely: 1,
        billy: 1,
        bradly: 1,
        bristly: 1,
        bubbly: 1,
        bully: 1,
        burly: 1,
        butterfly: 1,
        carly: 1,
        charly: 1,
        chilly: 1,
        comely: 1,
        completely: 1,
        comply: 1,
        consequently: 1,
        costly: 1,
        courtly: 1,
        crinkly: 1,
        crumbly: 1,
        cuddly: 1,
        curly: 1,
        currently: 1,
        daily: 1,
        dastardly: 1,
        deadly: 1,
        deathly: 1,
        definitely: 1,
        dilly: 1,
        disorderly: 1,
        doily: 1,
        dolly: 1,
        dragonfly: 1,
        early: 1,
        elderly: 1,
        elly: 1,
        emily: 1,
        especially: 1,
        exactly: 1,
        exclusively: 1,
        family: 1,
        finally: 1,
        firefly: 1,
        folly: 1,
        friendly: 1,
        frilly: 1,
        gadfly: 1,
        gangly: 1,
        generally: 1,
        ghastly: 1,
        giggly: 1,
        globally: 1,
        goodly: 1,
        gravelly: 1,
        grisly: 1,
        gully: 1,
        haily: 1,
        hally: 1,
        harly: 1,
        hardly: 1,
        heavenly: 1,
        hillbilly: 1,
        hilly: 1,
        holly: 1,
        holy: 1,
        homely: 1,
        homily: 1,
        horsefly: 1,
        hourly: 1,
        immediately: 1,
        instinctively: 1,
        imply: 1,
        italy: 1,
        jelly: 1,
        jiggly: 1,
        jilly: 1,
        jolly: 1,
        july: 1,
        karly: 1,
        kelly: 1,
        kindly: 1,
        lately: 1,
        likely: 1,
        lilly: 1,
        lily: 1,
        lively: 1,
        lolly: 1,
        lonely: 1,
        lovely: 1,
        lowly: 1,
        luckily: 1,
        mealy: 1,
        measly: 1,
        melancholy: 1,
        mentally: 1,
        molly: 1,
        monopoly: 1,
        monthly: 1,
        multiply: 1,
        nightly: 1,
        oily: 1,
        only: 1,
        orderly: 1,
        panoply: 1,
        particularly: 1,
        partly: 1,
        paully: 1,
        pearly: 1,
        pebbly: 1,
        polly: 1,
        potbelly: 1,
        presumably: 1,
        previously: 1,
        pualy: 1,
        quarterly: 1,
        rally: 1,
        rarely: 1,
        recently: 1,
        rely: 1,
        reply: 1,
        reportedly: 1,
        roughly: 1,
        sally: 1,
        scaly: 1,
        shapely: 1,
        shelly: 1,
        shirly: 1,
        shortly: 1,
        sickly: 1,
        silly: 1,
        sly: 1,
        smelly: 1,
        sparkly: 1,
        spindly: 1,
        spritely: 1,
        squiggly: 1,
        stately: 1,
        steely: 1,
        supply: 1,
        surly: 1,
        tally: 1,
        timely: 1,
        trolly: 1,
        ugly: 1,
        underbelly: 1,
        unfortunately: 1,
        unholy: 1,
        unlikely: 1,
        usually: 1,
        waverly: 1,
        weekly: 1,
        wholly: 1,
        willy: 1,
        wily: 1,
        wobbly: 1,
        wooly: 1,
        worldly: 1,
        wrinkly: 1,
        yearly: 1,
    };
}

function getComplexWords() {
    return {
        "a number of": ["many", "some"],
        abundance: ["enough", "plenty"],
        "accede to": ["allow", "agree to"],
        accelerate: ["speed up"],
        accentuate: ["stress"],
        accompany: ["go with", "with"],
        accomplish: ["do"],
        accorded: ["given"],
        accrue: ["add", "gain"],
        acquiesce: ["agree"],
        acquire: ["get"],
        additional: ["more", "extra"],
        "adjacent to": ["next to"],
        adjustment: ["change"],
        admissible: ["allowed", "accepted"],
        advantageous: ["helpful"],
        "adversely impact": ["hurt"],
        advise: ["tell"],
        aforementioned: ["remove"],
        aggregate: ["total", "add"],
        aircraft: ["plane"],
        "all of": ["all"],
        alleviate: ["ease", "reduce"],
        allocate: ["divide"],
        "along the lines of": ["like", "as in"],
        "already existing": ["existing"],
        alternatively: ["or"],
        ameliorate: ["improve", "help"],
        anticipate: ["expect"],
        apparent: ["clear", "plain"],
        appreciable: ["many"],
        "as a means of": ["to"],
        "as of yet": ["yet"],
        "as to": ["on", "about"],
        "as yet": ["yet"],
        ascertain: ["find out", "learn"],
        assistance: ["help"],
        "at this time": ["now"],
        attain: ["meet"],
        "attributable to": ["because"],
        authorize: ["allow", "let"],
        "because of the fact that": ["because"],
        belated: ["late"],
        "benefit from": ["enjoy"],
        bestow: ["give", "award"],
        "by virtue of": ["by", "under"],
        cease: ["stop"],
        "close proximity": ["near"],
        commence: ["begin or start"],
        "comply with": ["follow"],
        concerning: ["about", "on"],
        consequently: ["so"],
        consolidate: ["join", "merge"],
        constitutes: ["is", "forms", "makes up"],
        demonstrate: ["prove", "show"],
        depart: ["leave", "go"],
        designate: ["choose", "name"],
        discontinue: ["drop", "stop"],
        "due to the fact that": ["because", "since"],
        "each and every": ["each"],
        economical: ["cheap"],
        eliminate: ["cut", "drop", "end"],
        elucidate: ["explain"],
        employ: ["use"],
        endeavor: ["try"],
        enumerate: ["count"],
        equitable: ["fair"],
        equivalent: ["equal"],
        evaluate: ["test", "check"],
        evidenced: ["showed"],
        exclusively: ["only"],
        expedite: ["hurry"],
        expend: ["spend"],
        expiration: ["end"],
        facilitate: ["ease", "help"],
        "factual evidence": ["facts", "evidence"],
        feasible: ["workable"],
        finalize: ["complete", "finish"],
        "first and foremost": ["first"],
        "for the purpose of": ["to"],
        forfeit: ["lose", "give up"],
        formulate: ["plan"],
        "honest truth": ["truth"],
        however: ["but", "yet"],
        "if and when": ["if", "when"],
        impacted: ["affected", "harmed", "changed"],
        implement: ["install", "put in place", "tool"],
        "in a timely manner": ["on time"],
        "in accordance with": ["by", "under"],
        "in addition": ["also", "besides", "too"],
        "in all likelihood": ["probably"],
        "in an effort to": ["to"],
        "in between": ["between"],
        "in excess of": ["more than"],
        "in lieu of": ["instead"],
        "in light of the fact that": ["because"],
        "in many cases": ["often"],
        "in order to": ["to"],
        "in regard to": ["about", "concerning", "on"],
        "in some instances ": ["sometimes"],
        "in terms of": ["omit"],
        "in the near future": ["soon"],
        "in the process of": ["omit"],
        inception: ["start"],
        "incumbent upon": ["must"],
        indicate: ["say", "state", "or show"],
        indication: ["sign"],
        initiate: ["start"],
        "is applicable to": ["applies to"],
        "is authorized to": ["may"],
        "is responsible for": ["handles"],
        "it is essential": ["must", "need to"],
        literally: ["omit"],
        magnitude: ["size"],
        maximum: ["greatest", "largest", "most"],
        methodology: ["method"],
        minimize: ["cut"],
        minimum: ["least", "smallest", "small"],
        modify: ["change"],
        monitor: ["check", "watch", "track"],
        multiple: ["many"],
        necessitate: ["cause", "need"],
        nevertheless: ["still", "besides", "even so"],
        "not certain": ["uncertain"],
        "not many": ["few"],
        "not often": ["rarely"],
        "not unless": ["only if"],
        "not unlike": ["similar", "alike"],
        notwithstanding: ["in spite of", "still"],
        "null and void": ["use either null or void"],
        numerous: ["many"],
        objective: ["aim", "goal"],
        obligate: ["bind", "compel"],
        obtain: ["get"],
        "on the contrary": ["but", "so"],
        "on the other hand": ["omit", "but", "so"],
        "one particular": ["one"],
        optimum: ["best", "greatest", "most"],
        overall: ["omit"],
        "owing to the fact that": ["because", "since"],
        participate: ["take part"],
        particulars: ["details"],
        "pass away": ["die"],
        "pertaining to": ["about", "of", "on"],
        "point in time": ["time", "point", "moment", "now"],
        portion: ["part"],
        possess: ["have", "own"],
        preclude: ["prevent"],
        previously: ["before"],
        "prior to": ["before"],
        prioritize: ["rank", "focus on"],
        procure: ["buy", "get"],
        proficiency: ["skill"],
        "provided that": ["if"],
        purchase: ["buy", "sale"],
        "put simply": ["omit"],
        "readily apparent": ["clear"],
        "refer back": ["refer"],
        regarding: ["about", "of", "on"],
        relocate: ["move"],
        remainder: ["rest"],
        remuneration: ["payment"],
        require: ["must", "need"],
        requirement: ["need", "rule"],
        reside: ["live"],
        residence: ["house"],
        retain: ["keep"],
        satisfy: ["meet", "please"],
        shall: ["must", "will"],
        "should you wish": ["if you want"],
        "similar to": ["like"],
        solicit: ["ask for", "request"],
        "span across": ["span", "cross"],
        strategize: ["plan"],
        subsequent: ["later", "next", "after", "then"],
        substantial: ["large", "much"],
        "successfully complete": ["complete", "pass"],
        sufficient: ["enough"],
        terminate: ["end", "stop"],
        "the month of": ["omit"],
        therefore: ["thus", "so"],
        "this day and age": ["today"],
        "time period": ["time", "period"],
        "took advantage of": ["preyed on"],
        transmit: ["send"],
        transpire: ["happen"],
        "until such time as": ["until"],
        utilization: ["use"],
        utilize: ["use"],
        validate: ["confirm"],
        "various different": ["various", "different"],
        "whether or not": ["whether"],
        "with respect to": ["on", "about"],
        "with the exception of": ["except for"],
        witnessed: ["saw", "seen"],
    };
}

function getJustifierWords() {
    return {
        "i believe": 1,
        "i consider": 1,
        "i don't believe": 1,
        "i don't consider": 1,
        "i don't feel": 1,
        "i don't suggest": 1,
        "i don't think": 1,
        "i feel": 1,
        "i hope to": 1,
        "i might": 1,
        "i suggest": 1,
        "i think": 1,
        "i was wondering": 1,
        "i will try": 1,
        "i wonder": 1,
        "in my opinion": 1,
        "is kind of": 1,
        "is sort of": 1,
        just: 1,
        maybe: 1,
        perhaps: 1,
        possibly: 1,
        "we believe": 1,
        "we consider": 1,
        "we don't believe": 1,
        "we don't consider": 1,
        "we don't feel": 1,
        "we don't suggest": 1,
        "we don't think": 1,
        "we feel": 1,
        "we hope to": 1,
        "we might": 1,
        "we suggest": 1,
        "we think": 1,
        "we were wondering": 1,
        "we will try": 1,
        "we wonder": 1,
    };
}

function findAndSpan(sentence, string, type, data, replacements, pos = 0) {
    let index = -1;
    // find the string either at the start of the sentence with a space after the string
    // or in middle of sentence with space before and after the string
    // or at the end of the string with a space at the start of the string
    index =
        sentence === string
            ? 0
            : sentence.toLowerCase().indexOf(`${string} `) === 0
            ? 0
            : sentence.toLowerCase().indexOf(` ${string} `) > 0
            ? sentence.toLowerCase().indexOf(` ${string} `) + 1
            : sentence.toLowerCase().indexOf(` ${string}`) > 0 &&
              sentence.toLowerCase().indexOf(` ${string}`) ===
                  sentence.length - string.length - 1
            ? sentence.toLowerCase().indexOf(` ${string}`) + 1
            : -1;

    let a = { complex: "complex", qualifier: "adverbs" };
    if (index >= 0) {
        data[a[type]] += 1;

        return [
            {
                sentence,
                from: pos + index,
                to: pos + index + string.length,
                type: type,
                message:
                    a[type] === "complex"
                        ? replacements && replacements.length > 0
                            ? `Complex. Replace with ${replacements
                                  .map((x) => `'${x}'`)
                                  .join(" or ")}.`
                            : "Complex. Replace or omit."
                        : "Qualifier. Be Bold.",
                data: {
                    replacements,
                    complexWord: string,
                },
                showTooltip: true,
            },
            ...findAndSpan(
                sentence.slice(index + string.length),
                string,
                type,
                data,
                replacements,
                pos + index + string.length
            ),
        ];
    }

    return [];
}

function getQualifier(sentence, data) {
    let qualifiers = getQualifyingWords();
    let wordList = Object.keys(qualifiers);
    let results = [];
    wordList.forEach((key) => {
        results = [
            ...results,
            ...findAndSpan(sentence, key, "qualifier", data),
        ];
    });
    return {
        results,
        data,
    };
}

function getComplex(sentence, data) {
    let words = getComplexWords();
    let wordList = Object.keys(words);
    let results = [];
    wordList.forEach((key) => {
        results = [
            ...results,
            ...findAndSpan(sentence, key, "complex", data, words[key]),
        ];
    });

    return {
        results,
        data,
    };
}

function getAdverbs(sentence, data) {
    let lyWords = getLyWords();
    let results = [];
    let lengthSoFar = 0;
    sentence.split(" ").map((word, i) => {
        if (
            word.replace(/[^a-z0-9. ]/gi, "").match(/ly$/) &&
            lyWords[word.replace(/[^a-z0-9. ]/gi, "").toLowerCase()] ===
                undefined
        ) {
            results.push({
                sentence,
                from: sentence.slice(lengthSoFar).indexOf(word) + lengthSoFar,
                to:
                    sentence.slice(lengthSoFar).indexOf(word) +
                    lengthSoFar +
                    word.length,
                type: "adverbs",
                message: "Adverb. Use a forceful verb.",
                showTooltip: true,
                data: {
                    adverb: word,
                },
            });
            data.adverbs += 1;
        }

        lengthSoFar += word.length + 1;
    });

    return {
        results,
        data,
    };
}

function calculateLevel(letters, words, sentences) {
    if (words === 0 || sentences === 0) {
        return 0;
    }
    let level = Math.round(
        4.71 * (letters / words) + (0.5 * words) / sentences - 21.43
    );
    return level <= 0 ? 0 : level;
}

function checkPrewords(sentence, match, data, pos = 0) {
    let preWords = ["is", "are", "was", "were", "be", "been", "being"];
    let index = sentence.indexOf(` ${match}`);
    if (index >= 0) {
        let firstWordBeforeIndex = sentence.slice(0, index).split(" ");
        if (firstWordBeforeIndex.length > 0) {
            firstWordBeforeIndex =
                firstWordBeforeIndex[firstWordBeforeIndex.length - 1];

            if (preWords.indexOf(firstWordBeforeIndex) >= 0) {
                data.passiveVoice += 1;

                return [
                    {
                        sentence,
                        from:
                            index -
                            preWords[preWords.indexOf(firstWordBeforeIndex)]
                                .length +
                            pos,
                        to: index + 1 + match.length + pos,
                        type: "passiveVoice",
                        message: "Passive. Use active voice.",
                        showTooltip: true,
                        data: {
                            passive: `${
                                preWords[preWords.indexOf(firstWordBeforeIndex)]
                            } ${match}`,
                        },
                    },
                    ...checkPrewords(
                        sentence.slice(index + 1 + match.length),
                        match,
                        data,
                        pos + index + 1 + match.length
                    ),
                ];
            }
        }
    }

    return [];
}

function getPassive(sentence, data) {
    let words = sentence
        .replace(/[^a-z0-9. ]/gi, "")
        .toLowerCase()
        .split(" ");
    let ed = words.filter((word) => word.match(/ed$/));
    var results = [];
    if (ed.length > 0) {
        ed.forEach((match) => {
            results = [...results, ...checkPrewords(sentence, match, data)];
        });
    }
    return {
        results,
        data,
    };
}

function getDifficultSentences(p, data) {
    // split into sentences using . ! ? -
    let sentences = [];
    let pc = p;

    for (var i = 0; i < pc.length; i++) {
        // if pc[i] is a . ! ? -
        if (pc[i].match(/\.|\?|!/)) {
            sentences.push(pc[i]);
        } else if (pc[i] === " " && i > 0) {
            if (pc[i - 1].match(/\.|\?|!/)) {
                sentences[sentences.length - 1] += pc[i];
                sentences.push("");
            } else {
                if (sentences.length > 0) {
                    sentences[sentences.length - 1] += pc[i];
                } else {
                    sentences.push(pc[i]);
                }
            }
        } else {
            if (sentences.length > 0) {
                sentences[sentences.length - 1] += pc[i];
            } else {
                sentences.push(pc[i]);
            }
        }
    }

    data.sentences += sentences
        .filter((x) => x.trim())
        .filter((x) => {
            // should not be . ! ? -
            return x.length != 1 || !x.match(/\.|\?|! /);
        }).length;

    let results = [];

    let lengthSoFar = 0;

    sentences.map((sent, i) => {
        if (sent.trim().length === 0) {
            lengthSoFar += sent.length;
        } else if (sent.length === 2 && sent.match(/\.|\?|!|- /)) {
            lengthSoFar += sent.length;
            return;
        }

        let words = sent.split(" ").length;
        let letters = sent.split(" ").join("").length;
        data.words += words;
        data.letters += letters;

        const { results: rs } = getAdverbs(sent, data);
        results = [
            ...results,
            ...rs.map((x) => {
                x.from += lengthSoFar;
                x.to += lengthSoFar;
                return x;
            }),
        ];

        const { results: rs2 } = getComplex(sent, data);
        results = [
            ...results,
            ...rs2.map((x) => {
                x.from += lengthSoFar;
                x.to += lengthSoFar;
                return x;
            }),
        ];

        const { results: rs3 } = getPassive(sent, data);
        results = [
            ...results,
            ...rs3.map((x) => {
                x.from += lengthSoFar;
                x.to += lengthSoFar;
                return x;
            }),
        ];

        const { results: rs4 } = getQualifier(sent, data);
        results = [
            ...results,
            ...rs4.map((x) => {
                x.from += lengthSoFar;
                x.to += lengthSoFar;
                return x;
            }),
        ];

        let level = calculateLevel(letters, words, 1);
        if (words < 14) {
        } else if (level >= 10 && level < 14) {
            data.hardSentences += 1;
            results.push({
                sentence: sent,
                from: lengthSoFar,
                to: lengthSoFar + sent.length,
                type: "hardSentences",
                message: `Hard to read.`,
                showTooltip: true,
                data: {
                    sentence: sent,
                },
            });
        } else if (level >= 14) {
            data.veryHardSentences += 1;

            results.push({
                sentence: sent,
                from: lengthSoFar,
                to: lengthSoFar + sent.length,
                type: "veryHardSentences",
                message: `Very hard to read.`,
                showTooltip: true,
                data: {
                    sentence: sent,
                },
            });
        } else {
        }

        lengthSoFar += sent.length;
    });

    return {
        data,
        results,
    };
}

class TeacherPlugin {
    constructor(doc) {
        this.doc = doc;
        this.results = [];
        this.metadata = {};
    }

    scan() {
        return this;
    }

    record(message, from, to, type, fix, sentence, showTooltip, data = {}) {
        this.results.push({
            message,
            from,
            to,
            fix,
            type,
            sentence,
            showTooltip,
            data,
        });
    }

    getResults() {
        return this.results;
    }

    getMetadata() {
        return this.metadata;
    }
}

class HeadingLevel extends TeacherPlugin {
    fixHeaderLevel(level) {
        return (view, issue) => {
            view.dispatch(
                view.state.tr.setNodeMarkup(issue.from - 1, undefined, {
                    level,
                })
            );
        };
    }

    scan() {
        let lastScannedLevel = 0;
        let detectedH1 = false;

        let headingLevelTotal = 0;
        let moreThanOneH1Total = 0;
        let firstElementNotH1 = 0;

        this.doc.descendants((node, pos) => {
            if (
                !detectedH1 &&
                pos === 0 &&
                !firstElementNotH1 &&
                (node.type.name !== "heading" || node.attrs.level !== 1)
            ) {
                this.record(
                    "First element should be H1",
                    pos + 1,
                    pos + 1 + node.content.size,
                    "FirstElementNotH1",
                    (view, issue) => {
                        view.dispatch(
                            view.state.tr.insert(
                                0,
                                view.state.schema.nodes.heading.create({
                                    level: 1,
                                })
                            )
                        );
                    },
                    node.text,
                    true
                );

                firstElementNotH1 += 1;
            }

            if (node.type.name === "heading") {
                const level = node.attrs.level;

                if (lastScannedLevel !== 0 && level > lastScannedLevel + 1) {
                    this.record(
                        `Heading level too small. Current level is ${level}. Should be ${
                            lastScannedLevel + 1
                        }`,
                        pos + 1,
                        pos + 1 + node.content.size,
                        "HeadingLevel",
                        this.fixHeaderLevel(lastScannedLevel + 1),
                        node.content.content[0]?.text,
                        true,
                        {
                            sentence: node.content.content[0]?.text,
                        }
                    );

                    headingLevelTotal += 1;
                }

                if (level === 1 && detectedH1) {
                    // text of h1 node 'node' is not node.text
                    this.record(
                        `Only one H1 is allowed. Current level is ${level}`,
                        pos + 1,
                        pos + 1 + node.nodeSize,
                        "MoreThanOneH1",
                        this.fixHeaderLevel(2),
                        node.content.content[0]?.text,
                        true,
                        {
                            sentence: node.content.content[0]?.text,
                        }
                    );

                    moreThanOneH1Total += 1;
                }

                if (level === 1) {
                    detectedH1 = true;
                }

                lastScannedLevel = level;
            }
        });

        this.metadata = {
            headingLevelTotal,
            moreThanOneH1Total,
            firstElementNotH1,
        };

        return this;
    }
}

function getSentenceNodes(doc) {
    let allPs = [];
    let currentP = [];

    doc.descendants((node, pos) => {
        // check if text node
        if (!node.isText || !node.text) {
            if (currentP.length > 0) {
                allPs.push({
                    nodes: currentP,
                    text: currentP.map((x) => x.node.text).join(""),
                });
                currentP = [];
            }
        } else {
            currentP.push({
                node,
                pos,
            });
        }
    });

    if (currentP.length > 0) {
        allPs.push({
            nodes: currentP,
            text: currentP.map((x) => x.node.text).join(""),
        });
    }

    // group these nodes by sentences along with positions
    // each sentence should be separated by . ! ?
    // sentence can span multiple nodes
    let sentences = [];

    allPs.map((p, i) => {
        let sentenceFromLastNode = null;

        p.nodes.map(({ node, pos }) => {
            const t = node.text;
            // sentence is a split when . ! ? comes. separate t into sentence but each sentence should have the content it ends with (. ! ?) eith itself
            let sents = [];
            let sentSoFar = "";
            for (let i = 0; i < t.length; i++) {
                const char = t[i];
                sentSoFar += char;
                if (char === "." || char === "!" || char === "?") {
                    sents.push(sentSoFar);
                    sentSoFar = "";
                }
            }

            if (sentSoFar) {
                sents.push(sentSoFar);
            }

            let positionSoFar = 0;
            sents.map((sent) => {
                if (sent) {
                    // check if this is a sentence that ends with . ! ?
                    const lastChar = sent[sent.length - 1];
                    if (
                        lastChar === "." ||
                        lastChar === "!" ||
                        lastChar === "?"
                    ) {
                        if (!sentenceFromLastNode) {
                            sentences.push({
                                text: sent,
                                nodes: [
                                    {
                                        node,
                                        from: pos + positionSoFar,
                                        till:
                                            pos +
                                            positionSoFar +
                                            sent.length -
                                            1,
                                    },
                                ],
                            });
                        } else {
                            sentenceFromLastNode.text += sent;
                            sentenceFromLastNode.nodes.push({
                                node,
                                from: pos + positionSoFar,
                                till: pos + positionSoFar + sent.length - 1,
                            });

                            sentences.push(sentenceFromLastNode);
                            sentenceFromLastNode = null;
                        }
                    } else {
                        if (!sentenceFromLastNode) {
                            sentenceFromLastNode = {
                                text: sent,
                                nodes: [
                                    {
                                        node,
                                        from: pos + positionSoFar,
                                        till:
                                            pos +
                                            positionSoFar +
                                            sent.length -
                                            1,
                                    },
                                ],
                            };
                        } else {
                            sentenceFromLastNode.text += sent;
                            sentenceFromLastNode.nodes.push({
                                node,
                                from: pos + positionSoFar,
                                till: pos + positionSoFar + sent.length - 1,
                            });
                        }
                    }

                    positionSoFar += sent.length;
                }
            });
        });

        if (sentenceFromLastNode) {
            sentences.push(sentenceFromLastNode);
            sentenceFromLastNode = null;
        }
    });

    return { sentences, paragraphs: allPs };
}

class Music extends TeacherPlugin {
    isRoughlyConstant(numbers) {
        // get avg of numbers. then tolerance is 10% of avg.
        const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;

        const tolerance = avg * 0.2;

        for (let i = 1; i < numbers.length; i++) {
            // each number should be within 20% of avg

            const diff = Math.abs(numbers[i] - avg);

            if (diff > tolerance) {
                return false;
            }
        }

        return true;
    }

    isRoughlyIncreasing(numbers) {
        let tolerance;
        const len = numbers.length;

        for (let i = 1; i < len; i++) {
            // Set tolerance based on the index
            if (len <= 4) {
                tolerance = 1;
            } else if (len <= 6) {
                tolerance = i < 3 ? 1 : 2;
            } else if (len > 10) {
                tolerance = i < 7 ? 2 : 3;
            }

            // Check the difference in length between current and previous number
            const prevLength = numbers[i - 1];
            const currentLength = numbers[i];
            const diff = currentLength - prevLength;

            if (diff > 0) {
                // we are good
            } else if (diff < -tolerance) {
                return false;
            } else {
                // we are good
            }
        }

        // If we made it through the loop without returning, the sequence is roughly increasing
        return true;
    }

    avg(nums) {
        return nums.reduce((a, b) => a + b, 0) / nums.length;
    }

    scan() {
        let data = {
            monotonous: 0,
        };

        let sentences = getSentenceNodes(this.doc).sentences;
        sentences = sentences.filter((x) => x.text.length > 2);

        // skip the first senence since its h1
        sentences = sentences.slice(1);

        sentences = sentences.map((s, i) => {
            const currentText = s.text;
            const currentWordCount = currentText
                .split(" ")
                .filter((x) => x.trim()).length;

            // if last 5 are same as current, then monotony score is 10
            // if last 4 are same as current, then monotony score is 8
            // if last 3 are same as current, then monotony score is 6
            // if current is same as round(avg) of last 5, then monotony score is 5
            // if current is more or less than 2 of avg(last 5), then monotony score is 3
            // if current is more or less than 1 of avg(last 5), then monotony score is 4
            // if current is more or less than 3 of avg(last 5), then monotony score is 2

            const last4 = sentences
                .slice(Math.max(i - 4, 0), i)
                .map((x) => x.wordCount);
            const last5 = sentences
                .slice(Math.max(i - 5, 0), i)
                .map((x) => x.wordCount);
            const last3 = sentences
                .slice(Math.max(i - 3, 0), i)
                .map((x) => x.wordCount);

            const isSame = (arr) => {
                return arr.length > 0 && arr.every((x) => x === arr[0]);
            };

            const isSameLast4 = isSame([...last4, currentWordCount]);
            const isSameLast5 = isSame([...last5, currentWordCount]);
            const isSameLast3 = isSame([...last3, currentWordCount]);

            const moreOrLess = (arr, delta, current) => {
                const avg = this.avg(arr);
                const diff = Math.abs(avg - current);

                return diff <= delta;
            };

            const isMoreOrLess2 = moreOrLess(
                [...last5, currentWordCount],
                2,
                currentWordCount
            );
            const isMoreOrLess1 = moreOrLess(
                [...last5, currentWordCount],
                1,
                currentWordCount
            );
            const isMoreOrLess3 = moreOrLess(
                [...last5, currentWordCount],
                3,
                currentWordCount
            );

            let monotonyScore = 0;
            if (i < 3) {
                monotonyScore = 0;
            } else if (isSameLast4) {
                monotonyScore = 8;
            } else if (isSameLast5) {
                monotonyScore = 10;
            } else if (isSameLast3) {
                monotonyScore = 6;
            } else if (isMoreOrLess2) {
                monotonyScore = 3;
            } else if (isMoreOrLess1) {
                monotonyScore = 4;
            } else if (isMoreOrLess3) {
                monotonyScore = 2;
            } else {
                monotonyScore = 5;
            }

            s.wordCount = currentWordCount;
            s.monotonyScore = monotonyScore;

            return s;
        });

        sentences.map((s, i) => {
            s.monotonous = s.monotonyScore >= 6;
        });

        sentences
            .filter((x) => x.monotonous)
            .map((p, i) => {
                data.monotonous += 1;

                p.nodes.map((x) => {
                    this.record(
                        `Monotonous tone.`,
                        x.from,
                        x.till + 1,
                        "MonotonousTone",
                        null,
                        x.node.text,
                        true,
                        {
                            sentence: p.text,
                        }
                    );
                });
            });

        this.metadata = data;

        return this;
    }
}

class Readability extends TeacherPlugin {
    scan() {
        let data = {
            paragraphs: 0,
            sentences: 0,
            letters: 0,
            words: 0,
            hardSentences: 0,
            veryHardSentences: 0,
            adverbs: 0,
            passiveVoice: 0,
            complex: 0,
        };

        this.doc.descendants((node, pos) => {
            const isParagraph = node.type.name === "paragraph";
            data.paragraphs += isParagraph ? 1 : 0;

            if (!node.isText || !node.text) {
                return;
            }

            const text = node.text;

            const { results, data: d } = getDifficultSentences(text, data);

            data = d;

            results.forEach((issue) => {
                this.record(
                    issue.message || issue.type,
                    pos + issue.from,
                    pos + issue.to,
                    issue.type,
                    issue.data &&
                        issue.data.replacements &&
                        issue.data.replacements.length > 0
                        ? (view, issue) => {
                              const { from, to, data } = issue;
                              const { replacements } = data;

                              // replace the text with the first replacement
                              view.dispatch(
                                  view.state.tr.replaceWith(
                                      from,
                                      to,
                                      view.state.schema.text(replacements[0])
                                  )
                              );
                          }
                        : undefined,
                    issue.sentence,
                    issue.showTooltip,
                    issue.data
                );
            });
        });

        data.grade = calculateLevel(data.letters, data.words, data.sentences);
        this.metadata = data;

        return this;
    }
}

function renderIcon(issue) {
    const toolTip = document.createElement("div");
    toolTip.innerHTML = issue.message;
    return toolTip;
}

function runAllTeacherPlugins(doc, plugins) {
    const decorations = [];

    let data = {};

    const results = plugins
        .map((RegisteredTeacherPlugin) => {
            var pl = new RegisteredTeacherPlugin(doc).scan();
            var res = pl.getResults();
            var meta = pl.getMetadata();

            data = Object.assign({}, data, meta || {});

            return res;
        })
        .flat();

    results.forEach((issue) => {
        // the widget should come above the text
        var decors = {
            class:
                "problem " + issue.type + (issue.showTooltip ? " tooltip" : ""),
            "data-message": issue.message,
        };
        decors[`data-${issue.type}`] = issue.message;
        decorations.push(
            Decoration.inline(issue.from, issue.to, decors)
            // Decoration.widget(issue.from, renderIcon(issue))
        );
    });

    if (window.addReviewTooltipListeners) {
        debounce(() => {
            window.addReviewTooltipListeners();
        }, 1000)();
    }

    return {
        results,
        decorations: DecorationSet.create(doc, decorations),
        data,
    };
}

export const Teacher = Extension.create({
    name: "teacher",

    addStorage() {
        return {
            getIssues: (doc) => {
                return runAllTeacherPlugins(
                    doc,
                    this.storage.enabled ? this.options.plugins : []
                ).results;
            },
            enabled: false,
        };
    },

    addCommands() {
        return {
            enableTeacher:
                () =>
                ({ commands }) => {
                    // update the storage enabled flag here
                    this.storage.enabled = true;
                },
            disableTeacher:
                () =>
                ({ commands }) => {
                    // update the storage enabled flag here
                    this.storage.enabled = false;
                },
            toggleTeacher:
                () =>
                ({ commands }) => {
                    // update the storage enabled flag here
                    this.storage.enabled = !this.storage.enabled;
                },
            // get current transaction doc and runAllTeacherPlugins
            runTeacher:
                () =>
                ({ tr, commands, editor }) => {
                    const { results, decorations, data } = runAllTeacherPlugins(
                        tr.doc,
                        this.storage.enabled ? this.options.plugins : []
                    );

                    // apply the decorations here
                    tr.setMeta("teacher-decorations", decorations);

                    editor.view.dispatch(tr);

                    // return the results here
                    return {
                        results,
                        data,
                    };
                },
            getData:
                () =>
                ({ tr, commands, editor }) => {
                    const { results, decorations, data } = runAllTeacherPlugins(
                        tr.doc,
                        this.storage.enabled ? this.options.plugins : []
                    );

                    return {
                        results,
                        data,
                    };
                },
        };
    },

    addOptions() {
        return {
            plugins: [],
        };
    },

    addProseMirrorPlugins() {
        const { plugins } = this.options;

        let that = this;

        return [
            new Plugin({
                key: new PluginKey("teacher"),
                state: {
                    init(_, { doc }) {
                        return runAllTeacherPlugins(
                            doc,
                            that.storage && that.storage.enabled ? plugins : []
                        ).decorations;
                    },
                    apply(transaction, oldState) {
                        const decorations = transaction.getMeta(
                            "teacher-decorations"
                        );
                        return (
                            decorations ||
                            (transaction.docChanged
                                ? runAllTeacherPlugins(
                                      transaction.doc,
                                      that.storage && that.storage.enabled
                                          ? plugins
                                          : []
                                  ).decorations
                                : oldState)
                        );
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                    handleClick(view, _, event) {
                        const target = event.target;
                        if (
                            /lint-icon/.test(target.className) &&
                            target.issue
                        ) {
                            const { from, to } = target.issue;

                            view.dispatch(
                                view.state.tr
                                    .setSelection(
                                        TextSelection.create(
                                            view.state.doc,
                                            from,
                                            to
                                        )
                                    )
                                    .scrollIntoView()
                            );

                            return true;
                        }

                        return false;
                    },
                    handleDoubleClick(view, _, event) {
                        const target = event.target;
                        if (
                            /lint-icon/.test(event.target.className) &&
                            target.issue
                        ) {
                            const prob = target.issue;

                            if (prob.fix) {
                                prob.fix(view, prob);
                                view.focus();
                                return true;
                            }
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

export default Teacher.configure({
    plugins: [HeadingLevel, Readability, Music],
});