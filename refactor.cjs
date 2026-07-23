const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/store/AppStore.tsx');

const variableDeclarations = sourceFile.getVariableDeclarations();

function makePessimistic(decl, successToast) {
    if (!decl) return;
    const initializer = decl.getInitializerIfKind(SyntaxKind.CallExpression);
    if (!initializer || initializer.getExpression().getText() !== 'useCallback') return;
    
    const arrowFunc = initializer.getArguments()[0];
    if (arrowFunc.getKind() !== SyntaxKind.ArrowFunction) return;
    
    if (!arrowFunc.isAsync()) {
        arrowFunc.setIsAsync(true);
    }
    
    const body = arrowFunc.getBody();
    if (body.getKind() !== SyntaxKind.Block) return;
    
    const statements = body.getStatements();
    let setStatement = null;
    let promiseStatement = null;
    
    for (const stmt of statements) {
        const text = stmt.getText();
        if (text.startsWith('set') && !text.startsWith('setDoc')) {
            if (!setStatement) setStatement = stmt;
        } else if (text.includes('setDoc') || text.includes('updateDoc') || text.includes('deleteDoc') || text.includes('writeBatch')) {
            promiseStatement = stmt;
        }
    }
    
    if (setStatement && promiseStatement) {
        const originalSetText = setStatement.getText();
        const originalPromiseText = promiseStatement.getText();
        
        let cleanPromiseText = originalPromiseText.replace(/\.catch\([^)]+\)/, '').replace(/;$/, '');
        if (!cleanPromiseText.startsWith('await') && !cleanPromiseText.startsWith('return')) {
            cleanPromiseText = `await ${cleanPromiseText}`;
        }
        
        const otherStatements = statements.filter(s => s !== setStatement && s !== promiseStatement).map(s => s.getText());
        
        const newBody = `{
${otherStatements.join('\n')}
  try {
    ${cleanPromiseText};
    ${originalSetText}
    if ('${successToast}' !== '') {
      showToast('${successToast}', 'success');
    }
  } catch (err) {
    console.error(err);
    showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
  }
}`;
        arrowFunc.setBodyText(newBody.trim().replace(/^\{/, '').replace(/\}$/, ''));
        
        const depsArray = initializer.getArguments()[1];
        if (depsArray && depsArray.getKind() === SyntaxKind.ArrayLiteralExpression) {
            const deps = depsArray.getElements().map(e => e.getText());
            if (!deps.includes('showToast')) {
                depsArray.addElement('showToast');
            }
        }
    }
}

makePessimistic(sourceFile.getVariableDeclaration('addTask'), '업무가 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('updateTaskText'), '업무가 수정되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('updateTaskNote'), '업무 메모가 수정되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteTask'), '업무가 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addLedgerEntry'), '가계부 내역이 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteLedgerEntry'), '가계부 내역이 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteEvent'), '일정이 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addNote'), '메모가 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteNote'), '메모가 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addFixedExpense'), '고정지출이 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteFixedExpense'), '고정지출이 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addCategory'), '카테고리가 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteCategory'), '카테고리가 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addCategoryKeyword'), '키워드가 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('removeCategoryKeyword'), '키워드가 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('setCategoryOrder'), '카테고리 순서가 변경되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addAgenda'), '이달 목표가 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteAgenda'), '이달 목표가 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addAnniversary'), '기념일이 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteAnniversary'), '기념일이 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('addMonthlyEvent'), '매월 반복 일정이 추가되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('deleteMonthlyEvent'), '매월 반복 일정이 삭제되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('updateHolidayConfig'), '공휴일 설정이 저장되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('setCardPaymentDayState'), '카드 결제일이 저장되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('setCardBillingDays'), '카드 이용기간이 저장되었습니다.');
makePessimistic(sourceFile.getVariableDeclaration('setPaydayState'), '급여일이 저장되었습니다.');

// Save changes
sourceFile.saveSync();
console.log('Refactoring complete.');
