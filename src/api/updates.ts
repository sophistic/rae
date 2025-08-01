import axios from "axios";
import { useUserStore } from "@/store/userStore";

const BASE_URL = "https://quackback-xwhd.onrender.com/api/auth";

const { email } = useUserStore();
export const NameUpdate = async (name: string) => {
  //Yet to add Update Name Func
};
