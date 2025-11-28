const readline = require('readline');
const mathLib = require('mathjs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (txt) => new Promise(resolve => rl.question(txt, resolve));

async function askNumber(msg) {
    while (true) {
        const data = await ask(msg);
        const num = parseFloat(data);
        if (!isNaN(num)) return num;
        console.log('Enter valid num\n');
    }
}

async function inEx(txt, ele = 'x') {
    while (true) {
        const inp = await ask(txt);
        try {
            const comp = mathLib.compile(inp);
            comp.evaluate({ [ele]: 1 });
            return { data: inp, compiled: comp };
        } catch (err) {
            console.log(`Error: ${err.message} \n`);
        }
    }
}

class RootSolver {
    constructor(obj, tol) {
        this.strFn = obj.data;
        this.compFn = obj.compiled;
        this.tol = tol;
        this.maxSteps = 100;
    }

    f(x) {
        try {
            return this.compFn.evaluate({ x });
        } catch (e) {
            return NaN;
        }
    }

    fDre(x) {
        try {
            const df = mathLib.derivative(this.strFn, 'x');
            return df.evaluate({ x });
        } catch (err) {
            return NaN;
        }
    }

    printTable(method, data, root) {
        console.log(`\n=== ${method} ===`);
        const table = data.map(item => {
            const tItem = {};
            for (const i in item) {
                let v = item[i];
                if (typeof v === 'number') {
                    tItem[i] = Number(v.toFixed(12));
                } else {
                    tItem[i] = v;
                }
            }
            return tItem;
        });
        console.table(table);
        console.log('\nroot = ' + root.toFixed(12) + '\n');
    }

    async bisection() {
        console.log("-> Bisection:\n");
        let a = await askNumber("Left bound (a): ");
        let b = await askNumber("Right bound (b): ");
        let fA = this.f(a);
        let fB = this.f(b);
        if (fA * fB >= 0) {
            console.log("f(a) * f(b) must be -ve\n");
            return;
        }
        let step = 0;
        let pre = 0;
        let err = 100;
        let c = 0;
        const table = [];
        while (err > this.tol && step < this.maxSteps) {
            step++;
            c = (a + b) / 2;
            const fC = this.f(c);
            if (step > 1) {
                err = Math.abs(c - pre);
            }
            table.push({
                a: a,
                b: b,
                c: c,
                'f(c)': (fC > 0 ? '+ve' : '-ve'),
                'Err': step > 1 ? err : '--'
            });
            pre = c;
            if (fC === 0) break;
            if (fC < 0) {
                b = c;
            } else {
                a = c;
            }
        }
        this.printTable("Bisection", table, c);
    }

    async falsePosition() {
        console.log("-> False Position:\n");
        let a = await askNumber("Left bound (a): ");
        let b = await askNumber("Right bound (b): ");
        let fA = this.f(a);
        let fB = this.f(b);
        if (fA * fB >= 0) {
            console.log("f(a) * f(b) must be -ve\n");
            return;
        }
        let i = 0;
        let prev = 0;
        let err = 100;
        let c = 0;
        const table = [];
        while (err > this.tol && i < this.maxSteps) {
            i++;
            if ((fB - fA) === 0) break;
            c = (a * fB - b * fA) / (fB - fA);
            const fC = this.f(c);
            if (i > 1) err = Math.abs(c - prev);
            table.push({
                a: a,
                b: b,
                c: c,
                'f(c)': (fC > 0 ? '+ve' : '-ve'),
                'Err': i > 1 ? err : '--'
            });
            prev = c;
            if (fC === 0) break;
            if (fA * fC < 0) {
                b = c;
                fB = fC;
            } else {
                a = c;
                fA = fC;
            }
        }
        this.printTable("False Position", table, c);
    }

    async fixedPoint() {
        console.log("-> Fixed Point:\n");
        const gObj = await inEx("Enter g(x): ");
        let x = await askNumber("(x0): ");
        const g = gObj.compiled;
        let err = 100;
        let n = 0;
        const table = [];
        while (err > this.tol && n < this.maxSteps) {
            n++;
            const prev = x;
            try {
                x = g.evaluate({ x: prev });
            } catch (e) {
                console.log(`Error ${e.message}`);
                return;
            }
            if (x !== 0) err = Math.abs(x - prev)
            else err = 0;
            table.push({
                'x(i-1)': prev,
                'x(i)': x,
                'Err': err
            });
        }
        if (n >= this.maxSteps) {
            console.log("Reached max iterations");
        }
        this.printTable("Fixed Point", table, x);
    }

    async newtonRaphson() {
        console.log("-> Newton-Raphson:\n");
        let x = await askNumber("(x0): ");
        let err = 100;
        let i = 0;
        const table = [];
        while (err > this.tol && i < this.maxSteps) {
            i++;
            const fX = this.f(x);
            const fDash = this.fDre(x);
            if (fDash === 0) {
                console.log("F'(x) = 0\n");
                break;
            }
            const next = x - fX / fDash;
            if (next !== 0) err = Math.abs(next - x);
            else err = 0;
            table.push({
                'x(i-1)': x,
                'x(i)': next,
                'Err': err
            });
            x = next;
        }
        this.printTable("Newton-Raphson", table, x);
    }

    async secant() {
        console.log("-> Secant Method:\n");
        let x0 = await askNumber("(x0): ");
        let x1 = await askNumber("(x1): ");
        let err = 100;
        let i = 0;
        const table = [];
        while (err > this.tol && i < this.maxSteps) {
            i++;
            const f0 = this.f(x0);
            const f1 = this.f(x1);
            if ((f1 - f0) === 0) {
                console.log(`(f${i - 1} - f${i}) = 0)\n`);
                break;
            }
            const x2 = x1 - f1 * ((x1 - x0) / (f1 - f0));
            err = Math.abs(x2 - x1);
            table.push({
                'x(i-1)': x0,
                'x(i)': x1,
                'x(i+1)': x2,
                'Err': err
            });
            x0 = x1;
            x1 = x2;
        }
        this.printTable("Secant", table, x1);
    }
}

class LinearSystemSolver {
    constructor(n, A, B, tol) {
        this.n = n;
        this.A = A;
        this.B = B;
        this.tol = tol;
        this.maxSteps = 100;
        this.isDominant = false;
    }

    DiagonallyDominant() {
        if (this.isDominant) return true;

        let rows = this.A.map((row, i) => ({
            row: [...row],
            b: this.B[i],
            originalIndex: i
        }));

        let newA = new Array(this.n);
        let newB = new Array(this.n);
        let used = new Array(this.n).fill(false);
        let canFix = true;

        for (let i = 0; i < this.n; i++) {
            let selectedRowIndex = -1;

            for (let r = 0; r < this.n; r++) {
                if (used[r]) continue;

                let currentRow = rows[r].row;
                let diagVal = Math.abs(currentRow[i]);
                let sumOther = 0;
                for (let c = 0; c < this.n; c++) {
                    if (c !== i) sumOther += Math.abs(currentRow[c]);
                }

                if (diagVal >= sumOther) {
                    selectedRowIndex = r;
                    break;
                }
            }

            if (selectedRowIndex === -1) {
                let maxVal = -1;
                for (let r = 0; r < this.n; r++) {
                    if (!used[r]) {
                        if (Math.abs(rows[r].row[i]) > maxVal) {
                            maxVal = Math.abs(rows[r].row[i]);
                            selectedRowIndex = r;
                        }
                    }
                }
                if (selectedRowIndex !== -1) {
                    let currentRow = rows[selectedRowIndex].row;
                    let sumOther = currentRow.reduce((acc, val, idx) => idx !== i ? acc + Math.abs(val) : acc, 0);
                    if (Math.abs(currentRow[i]) < sumOther) {
                        canFix = false;
                    }
                }
            }

            if (selectedRowIndex !== -1) {
                used[selectedRowIndex] = true;
                newA[i] = rows[selectedRowIndex].row;
                newB[i] = rows[selectedRowIndex].b;
            } else {
                canFix = false;
            }
        }

        this.A = newA;
        this.B = newB;
        this.isDominant = true;

        return canFix;
    }

    formatRow(iter, xValues, error) {
        let row = { Iter: iter };
        for (let i = 0; i < this.n; i++) {
            row[`x${i + 1}`] = Number(xValues[i].toFixed(10));
        }
        row['Error'] = (typeof error === 'number') ? Number(error.toFixed(10)) : error;
        return row;
    }

    async jacobi() {
        console.log("\n-> Jacobi Method:");
        this.DiagonallyDominant();

        let x = new Array(this.n).fill(0);
        let newX = new Array(this.n).fill(0);
        let err = 100;
        let iter = 0;
        const table = [];

        table.push(this.formatRow(0, x, '--'));

        while (err > this.tol && iter < this.maxSteps) {
            iter++;

            for (let i = 0; i < this.n; i++) {
                let sum = 0;
                for (let j = 0; j < this.n; j++) {
                    if (j !== i) {
                        sum += this.A[i][j] * x[j];
                    }
                }
                newX[i] = (this.B[i] - sum) / this.A[i][i];
            }

            err = 0;
            for (let i = 0; i < this.n; i++) {
                let diff = Math.abs(newX[i] - x[i]);
                if (diff > err) err = diff;
            }

            x = [...newX];
            table.push(this.formatRow(iter, x, err));
        }
        console.table(table);
    }

    async gaussSeidel() {
        console.log("\n-> Gauss-Seidel Method:");
        this.DiagonallyDominant();

        let x = new Array(this.n).fill(0);
        let err = 100;
        let iter = 0;
        const table = [];

        table.push(this.formatRow(0, x, '--'));

        while (err > this.tol && iter < this.maxSteps) {
            iter++;
            let maxErr = 0;
            let xOld = [...x];

            for (let i = 0; i < this.n; i++) {
                let sum = 0;
                for (let j = 0; j < this.n; j++) {
                    if (j !== i) {
                        sum += this.A[i][j] * x[j];
                    }
                }
                x[i] = (this.B[i] - sum) / this.A[i][i];
            }

            for (let i = 0; i < this.n; i++) {
                let diff = Math.abs(x[i] - xOld[i]);
                if (diff > maxErr) maxErr = diff;
            }
            err = maxErr;

            table.push(this.formatRow(iter, x, err));
        }
        console.table(table);
    }

    async relaxation() {
        console.log("\n-> Relaxation Method:");
        this.DiagonallyDominant();

        let x = new Array(this.n).fill(0);

        let residuals = [...this.B];

        let maxRes = 100;
        let iter = 0;
        const table = [];

        table.push(this.formatRow(0, x, '--'));

        while (maxRes > this.tol && iter < this.maxSteps) {
            iter++;
            let k = -1;
            maxRes = -1;

            for (let i = 0; i < this.n; i++) {
                if (Math.abs(residuals[i]) > maxRes) {
                    maxRes = Math.abs(residuals[i]);
                    k = i;
                }
            }

            if (k === -1) break;
            let dx = residuals[k] / this.A[k][k];

            x[k] += dx;

            for (let i = 0; i < this.n; i++) {
                residuals[i] -= this.A[i][k] * dx;
            }

            table.push(this.formatRow(iter, x, maxRes));
        }
        console.table(table);
    }
}

async function runRootFinder() {
    console.log("\n--- SINGLE NON-LINEAR EQUATION ---");
    console.log("Examples: x^3 - 2*x - 5, cos(x) - x*e^x");
    const fn = await inEx("Enter f(x): ");
    const tol = await askNumber("Accuracy (e.g. 0.001): ");
    const solver = new RootSolver(fn, tol);

    while (true) {
        console.log("\nPick a method:");
        console.log("1. Bisection");
        console.log("2. False Position");
        console.log("3. Fixed Point (g(x))");
        console.log("4. Newton-Raphson");
        console.log("5. Secant");
        console.log("6. ALL methods");
        console.log("7. Back to Main Menu");

        const choice = await ask("Choice: ");
        switch (choice.trim()) {
            case '1': await solver.bisection(); break;
            case '2': await solver.falsePosition(); break;
            case '3': await solver.fixedPoint(); break;
            case '4': await solver.newtonRaphson(); break;
            case '5': await solver.secant(); break;
            case '6':
                await solver.bisection();
                await solver.falsePosition();
                await solver.fixedPoint();
                await solver.newtonRaphson();
                await solver.secant();
                break;
            case '7': return;
            default: console.log("Invalid.");
        }
    }
}

async function runLinearSystem() {
    console.log("\n--- LINEAR SYSTEM SOLVER (AX = B) ---");
    const n = await askNumber("Number of equations/unknowns (n): ");

    const A = [];
    const B = [];

    console.log(`\nEnter Coefficients for Matrix A and Constant B:`);
    console.log(`Format: a1x1 + a2x2 ... = b`);

    for (let i = 0; i < n; i++) {
        console.log(`\n-- Equation ${i + 1} --`);
        const row = [];
        for (let j = 0; j < n; j++) {
            row.push(await askNumber(`Coeff x${j + 1}: `));
        }
        A.push(row);
        B.push(await askNumber(`Constant (b${i + 1}): `));
    }

    const tol = await askNumber("\nRequired Accuracy (e.g., 0.0001): ");

    const solver = new LinearSystemSolver(n, A, B, tol);

    while (true) {
        console.log("\nPick a method:");
        console.log("1. Jacobi");
        console.log("2. Gauss-Seidel");
        console.log("3. Relaxation");
        console.log("4. ALL methods");
        console.log("5. Back to Main Menu");

        const choice = await ask("Choice: ");
        switch (choice.trim()) {
            case '2': await solver.gaussSeidel(); break;
            case '1': await solver.jacobi(); break;
            case '3': await solver.relaxation(); break;
            case '4':
                await solver.jacobi();
                await solver.gaussSeidel();
                await solver.relaxation();
                break;
            case '5': return;
            default: console.log("Invalid.");
        }
    }
}

async function main() {
    console.clear();
    console.log("=======================================================");
    console.log("   NUMERICAL ANALYSIS SOLVER (by Abdelrahman Ashraf)");
    console.log("=======================================================");

    while (true) {
        console.log("\nWhat would you like to solve?");
        console.log("1. Roots of Non-Linear Equation (f(x) = 0)");
        console.log("2. System of Linear Equations (Ax = B)");
        console.log("3. Exit");
        const choice = await ask("\nYour choice [1-3]: ");
        if (choice.trim() === '1') {
            await runRootFinder();
        } else if (choice.trim() === '2') {
            await runLinearSystem();
        } else if (choice.trim() === '3') {
            rl.close();
            process.exit(0);
        } else {
            console.log("Invalid selection.");
        }
    }
}

main();