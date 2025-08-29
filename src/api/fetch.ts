{
  /*
  This is the fetch api.
  It is used to fetch the user's name.
*/
}

import axios from "axios";

const BASE_URL = "https://quackback-xwhd.onrender.com";

export const fetchUserName = async (email: string | null): Promise<string> => {
  const { data } = await axios.post(
    "https://quackback-xwhd.onrender.com/api/update/get-name",
    {
      email: email,
    },
  );
  console.log("heres the response bro :", data);
  return data.name;
};
