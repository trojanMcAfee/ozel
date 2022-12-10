import React from "react";
import { Link } from "react-router-dom";

import "./about.styles.scss";

function About() {
  return (
    <>
      <div className="about">
        <Link className="backBtn" to="/">
          {" "}
          &lt; back
        </Link>
          <h1>About</h1>
      </div>
    </>
  );
}

export default About;
