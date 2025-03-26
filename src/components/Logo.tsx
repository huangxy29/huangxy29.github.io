import Avatar from "boring-avatars";
import React from 'react';

const variants = ["beam", "pixel"];

function getRandomElement(arr: string[]): "beam" | "pixel" {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex] as  "beam" | "pixel" ;
}

const Logo: React.FC = () => {
  return <Avatar name="huangxy29" variant={getRandomElement(variants)} size={44} />;
};

export default Logo;
