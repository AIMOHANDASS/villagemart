import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotificationBell({ user }: any) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch(`https://villagesmart.in/api/notifications/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setCount(data.filter((n:any)=>!n.is_read).length);
      });
  }, []);

  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
          {count}
        </span>
      )}
    </div>
  );
}
