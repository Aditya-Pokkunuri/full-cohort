import fs from 'fs';
const path = 'c:\\Users\\Harshitha\\OneDrive\\Desktop\\full-cohort\\components\\executive\\pages\\StudentReviewPage.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const keepers = lines.slice(0, 1017);

const tail = [
    '                                                </div>',
    '                                            </div>',
    '                                        </>',
    '                                    )}',
    '',
    '                                    <button',
    '                                        type="submit"',
    '                                        disabled={saving}',
    '                                        style={{',
    '                                            padding: "14px 24px", backgroundColor: "#8b5cf6", color: "#fff",',
    '                                            borderRadius: "12px", fontWeight: "bold", border: "none",',
    '                                            cursor: "pointer", width: "100%", fontSize: "1rem", marginTop: "24px"',
    '                                        }}',
    '                                    >',
    '                                        {saving ? "Saving..." : "Save Skills Assessment"}',
    '                                    </button>',
    '                                </form>',
    '                            )}',
    '                        </div>',
    '                    </div>',
    '                </div>',
    '            )}',
    '        </div>',
    '    );',
    '};',
    '',
    'export default StudentReviewPage;'
];

fs.writeFileSync(path, keepers.concat(tail).join('\n'));
console.log('Fixed StudentReviewPage.tsx');
