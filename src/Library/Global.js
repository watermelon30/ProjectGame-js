const CONFIG =
{
    //Game-related parameters that can be altered.
    canvasWidth: 5000,
    canvasHeight: 5000,
    maxPoint: 1000,
    gridGap: 50,
    fps: 60,
    energyBonusRate: 2,

    circleDefaultR: 50,
    circleLifeAmount: 250,
    circleStretchRate: 0.001,
    circleShrinkRate: 0.005,
    circleMaxR: 150,
    circleMinR: 30,
    circleMaxInvMode: 15,

    lineDefaultL: 100,
    lineLifeAmount: 100,
    lineStretchRate: 0.001,
    lineShrinkRate: 0.005,
    lineMinLength: 40,
    lineMaxLength: 300,
    lineMaxAmmo: 1000,
    ammoReload: 1,

    rectDefaultW: 40,
    rectDefaultH: 120,
    rectangleLifeAmount: 500,
    rectangleStretchRate: 0.002,
    rectangleShrinkRate: 0.003,
    rectangleMaxW: 150,
    rectangleMaxH: 450,
    rectangleMinW: 20,
    rectangleMinH: 60,
    pointRadius: 15
}

const PLAYERTYPE =
{
    rectangle: "Rectangle",
    line: "Line",
    circle: "Circle"
}

export { CONFIG, PLAYERTYPE }