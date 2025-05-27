import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateUser } from "../actions";
import seedrandom from "seedrandom";
import AppWrapper from "../containers/AppWraper";
import MobileTabBar from "../components/MobileTabBar";

const WEEKS_IN_LIFE = 4000;
const WEEKS_PER_YEAR = 52;
const YEARS_SHOWN = Math.ceil(WEEKS_IN_LIFE / WEEKS_PER_YEAR);

// Theme colors from tailwind config
const THEME_COLORS = [
  "#3c3e33",
  "#bda693",
  "#727469",
  "#27291e",
  "#c0c0c0",
  "#69717d",
  "#95645f",
  "#c9c7b1",
  "#b69c41",
  "#8f948f",
  "#eeefe7",
];


function FourThousandWeeks({ userId, settings, name, email, ...props }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [birthday, setBirthday] = useState(settings?.birthday || null);

  // Generate seeded random colors based on userId and birthday
  const getSeededColor = (week) => {
    if (!userId || !birthday) return "rgb(229 231 235)"; // gray-200 as default
    const rng = seedrandom(`${userId}-${birthday}-${week}`);
    return THEME_COLORS[Math.floor(rng() * THEME_COLORS.length)];
  };

  // Calculate weeks lived if birthday is set
  const getWeeksLived = () => {
    if (!birthday) return 0;

    const birthDate = new Date(birthday);
    const today = new Date();

    // Calculate total weeks lived
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
    const totalWeeksLived = Math.floor((today - birthDate) / msInWeek);

    // Get the birthday for this year
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // If birthday hasn't occurred this year yet, use last year's birthday as reference
    if (today < thisYearBirthday) {
      thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() - 1);
    }

    // Calculate weeks since last birthday
    const weeksSinceLastBirthday = Math.ceil(
      (today - thisYearBirthday) / msInWeek
    );

    return {
      totalWeeks: Math.min(totalWeeksLived, WEEKS_IN_LIFE),
      currentWeek: weeksSinceLastBirthday,
    };
  };

  useEffect(() => {
    if (!birthday) {
      const today = new Date().toISOString().split("T")[0];
      dispatch(
        updateUser({
          settings: {
            ...(settings || {}),
            birthday: today,
          },
        })
      );
      setBirthday(today);
    }
  }, [birthday, settings, dispatch]);

  const weeksLivedData = getWeeksLived();
  const weeksLived = weeksLivedData.totalWeeks;
  const currentYear = Math.floor(weeksLived / WEEKS_PER_YEAR);
  const currentWeek = weeksLivedData.currentWeek;
  const totalYears = 77;
  const maxTotalWeeks = 4000;

  return (
    <AppWrapper
      userId={userId}
      name={name}
      email={email}
      {...props}
      isListPage={false}
      is4000Page={true}
    >
      <div className="flex-grow flex flex-col md:flex-row border-t-2 border-gray-200 max-w-screen-2xl overflow-y-auto">
        <div className="flex flex-col h-full md:w-full max-w-screen-md">
          <div className="px-8 py-6 overflow-x-visible">
            <h1 className="text-xl font-black mb-1">4000 weeks</h1>

            <div className="mt-0 text-sm text-gray-900">
              <p>
                Year {currentYear} • Week {currentWeek} • {weeksLived} weeks
              </p>
            </div>

            <div className="bg-transparent gap-0 md:gap-0.5 flex flex-col mt-10 overflow-x-visible relative ml-0">
              {/* Week label and arrow */}
              <div className="absolute -top-5 left-8 flex items-center -ml-5">
                <span className="text-sm mr-1">Week</span>
                <span className="text-sm">→</span>
              </div>

              {/* Year label and arrow */}
              <div className="absolute -left-6 top-4">
                <div className="relative">
                  <span className="text-sm inline-block origin-top-right -rotate-90 translate-x-[-100%] whitespace-nowrap">
                    Year
                  </span>
                  <span className="text-sm block mt-1 ml-[8px]">↓</span>
                </div>
              </div>

              <div
                key={0 + "year"}
                className={`hidden md:grid grid-cols-53 gap-0 md:gap-0.5 year-${0} overflow-x-visible`}
              >
                {Array.from({ length: WEEKS_PER_YEAR + 1 }).map((_, week) => {
                  if (week === 0) {
                    return <span className="text-xs text-center"></span>;
                  }
                  if (week === 1)
                    return (
                      <div className="flex flex-col">
                        <span className="text-xs text-center">1</span>
                      </div>
                    );
                  if (week === 52)
                    return (
                      <div className="flex flex-col">
                        <span className="text-xs text-center">52</span>
                      </div>
                    );
                  return (
                    <div
                      key={0}
                      className="relative aspect-square mt-1 p-1 w-full"
                      style={{}}
                    >
                      <div
                        className="rounded-full w-full h-full bg-black"
                        style={{
                          backgroundColor: getSeededColor(0),
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              {Array.from({ length: totalYears }).map((_, year) => {
                return (
                  <div
                    key={year + 1 + "year"}
                    className={`grid grid-cols-53 gap-0 md:gap-0.5 year-${
                      year + 1
                    }`}
                  >
                    {Array.from({ length: WEEKS_PER_YEAR + 1 }).map(
                      (_, week) => {
                        if (week === 0) {
                          if (year === 0)
                            return (
                              <div className="hidden md:flex flex-col">
                                <span
                                  className="text-xs text-center -mb-1"
                                  style={{ marginTop: "-3px" }}
                                >
                                  1
                                </span>
                              </div>
                            );
                          if (year === 76)
                            return (
                              <div className="hidden md:flex flex-col">
                                <span className="text-xs text-center -mb-1 -ml-1 -mt-0.5">
                                  77
                                </span>
                              </div>
                            );

                          return (
                            <div
                              key={0}
                              className="hidden md:block relative rounded-full p-1 w-full"
                              style={{}}
                            >
                              <div
                                className="rounded-full w-full h-full bg-black"
                                style={{
                                  backgroundColor: getSeededColor(0),
                                }}
                              ></div>
                            </div>
                          );
                        }

                        const weekNumber = year * WEEKS_PER_YEAR + week;
                        // Check if this square is in a past year or in current year but within weeks lived
                        const isLived =
                          year < currentYear ||
                          (year === currentYear && week <= currentWeek);
                        if (weekNumber > maxTotalWeeks) return null;
                        return (
                          <div
                            key={weekNumber}
                            className="relative group aspect-square w-full"
                            style={{
                              backgroundColor: isLived
                                ? getSeededColor(weekNumber)
                                : "rgb(229 231 235)",
                            }}
                          ></div>
                        );
                      }
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {!props.isSidebarOpen && (
        <MobileTabBar
          showHomeOption={true}
          showSearchOption={true}
          showSettingsOption={true}
          onSelect={(tabName) => {
            if (tabName === "search") {
              props.showSidebar();
            } else if (tabName === "home") {
              props.hideSidebar();
              navigate("/list");
              dispatch(
                changeSelectedNode({
                  id: "home",
                })
              );
            } else if (tabName === "settings") {
              props.hideSidebar();
              navigate("/settings");
            }
          }}
        />
      )}
    </AppWrapper>
  );
}


export default FourThousandWeeks;